alter table public.sales
  add column if not exists total_amount numeric(14,2);

alter table public.sales
  add column if not exists source text not null default 'manual';

update public.sales
set total_amount = round((quantity * unit_price)::numeric, 2)
where total_amount is null;

alter table public.sales
  alter column total_amount set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sales_source_check'
      and conrelid = 'public.sales'::regclass
  ) then
    alter table public.sales
      add constraint sales_source_check
      check (source in ('manual', 'import'));
  end if;
end $$;

create index if not exists sales_product_lookup
  on public.sales(organization_id, menu_item_id, sale_date);