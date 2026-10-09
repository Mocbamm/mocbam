-- Commit the enum addition before the following migration uses it.
alter type public.order_status add value if not exists 'returned';
