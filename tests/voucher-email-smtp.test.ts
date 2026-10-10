import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer, type TLSSocket } from "node:tls";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createVoucherMailer } from "@/lib/email-server";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("voucher email SMTP integration", () => {
  it("delivers separate MIME messages over authenticated TLS to a local-only synthetic SMTP sink", async () => {
    const directory = await mkdtemp(join(tmpdir(), "mocbam-smtp-qa-"));
    const keyFile = join(directory, "key.pem");
    const certFile = join(directory, "cert.pem");
    const sockets = new Set<TLSSocket>();
    const messages: { recipient: string; content: string }[] = [];
    let authenticated = 0;
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        keyFile,
        "-out",
        certFile,
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost,IP:127.0.0.1",
        "-days",
        "1",
      ],
      { stdio: "ignore" },
    );
    const certificate = await readFile(certFile);
    const server = createServer(
      { key: await readFile(keyFile), cert: certificate },
      (socket) => {
        sockets.add(socket);
        socket.on("close", () => sockets.delete(socket));
        socket.setEncoding("utf8");
        socket.write("220 localhost Synthetic SMTP sink\r\n");
        let buffer = "";
        let recipient = "";
        let content: string[] | null = null;
        socket.on("data", (chunk) => {
          buffer += chunk;
          while (buffer.includes("\r\n")) {
            const end = buffer.indexOf("\r\n");
            const line = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (content) {
              if (line === ".") {
                messages.push({ recipient, content: content.join("\r\n") });
                content = null;
                socket.write("250 Synthetic message accepted\r\n");
              } else content.push(line.replace(/^\.\./, "."));
            } else if (/^EHLO /i.test(line))
              socket.write(
                "250-localhost\r\n250-AUTH PLAIN\r\n250 SIZE 100000\r\n",
              );
            else if (/^AUTH PLAIN /i.test(line)) {
              authenticated++;
              socket.write("235 Authenticated for synthetic test\r\n");
            } else if (/^MAIL FROM:/i.test(line))
              socket.write("250 Sender accepted\r\n");
            else if (/^RCPT TO:/i.test(line)) {
              recipient = line.match(/<([^>]+)>/)?.[1] ?? "";
              socket.write(
                recipient.endsWith("@example.invalid")
                  ? "250 Recipient accepted\r\n"
                  : "550 Synthetic recipients only\r\n",
              );
            } else if (/^DATA$/i.test(line)) {
              content = [];
              socket.write("354 End with a dot\r\n");
            } else if (/^QUIT$/i.test(line)) {
              socket.end("221 Goodbye\r\n");
            } else socket.write("250 OK\r\n");
          }
        });
      },
    );
    try {
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const address = server.address();
      if (!address || typeof address === "string")
        throw new Error("Local SMTP listener unavailable");
      vi.stubEnv("SMTP_HOST", "127.0.0.1");
      vi.stubEnv("SMTP_PORT", String(address.port));
      vi.stubEnv("SMTP_SECURE", "true");
      vi.stubEnv("SMTP_USER", "synthetic-sender");
      vi.stubEnv("SMTP_PASSWORD", "synthetic-password");
      vi.stubEnv("SMTP_FROM", "shop@example.invalid");
      const actualCreateTransport = nodemailer.createTransport.bind(nodemailer);
      // Trust only the ephemeral fixture certificate, while preserving the real
      // production SMTP options and Nodemailer's actual network/MIME behavior.
      vi.spyOn(nodemailer, "createTransport").mockImplementation((options) =>
        actualCreateTransport({
          ...(options as SMTPTransport.Options),
          tls: { ca: certificate, servername: "localhost" },
        }),
      );
      const mailer = createVoucherMailer();
      try {
        await mailer.send({
          to: "buyer-one@example.invalid",
          subject: "Moc voucher one",
          text: "Private code PRIVATE7",
          deliveryId: "one",
        });
        await mailer.send({
          to: "buyer-two@example.invalid",
          subject: "Moc voucher two",
          text: "Private code PRIVATE7",
          deliveryId: "two",
        });
      } finally {
        mailer.close();
      }
      expect(authenticated).toBe(2);
      expect(messages).toHaveLength(2);
      expect(messages[0].recipient).toBe("buyer-one@example.invalid");
      expect(messages[0].content).toContain("PRIVATE7");
      expect(messages[0].content).toContain(
        "Message-ID: <voucher-one@example.invalid>",
      );
      expect(messages[0].content).not.toContain("buyer-two@example.invalid");
      expect(messages[1].content).not.toContain("buyer-one@example.invalid");
    } finally {
      sockets.forEach((socket) => socket.destroy());
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(directory, { recursive: true, force: true });
    }
  });
});
