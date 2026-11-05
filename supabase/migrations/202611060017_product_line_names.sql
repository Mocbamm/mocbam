-- Owner brief 06/11: the two product lines are called simply "Chuỗi" and
-- "Búp bê" everywhere (filters, product labels, breadcrumbs). Slugs, and so
-- every existing link, stay the same.
begin;
update public.categories set name = 'Búp bê' where slug = 'nhan-vat';
update public.categories set name = 'Chuỗi' where slug = 'chuoi';
commit;
