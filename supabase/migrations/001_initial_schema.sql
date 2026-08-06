-- Cia. do Caldinho — esquema inicial
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text,
  purchase_unit text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.ingredient_purchases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  purchase_date date not null,
  quantity numeric(14,4) not null check (quantity > 0),
  purchase_unit text not null,
  total_amount numeric(14,2) not null check (total_amount >= 0),
  supplier text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  yield_quantity numeric(14,4) not null default 1 check (yield_quantity > 0),
  yield_unit text not null default 'porção',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id),
  quantity numeric(14,4) not null check (quantity > 0),
  recipe_unit text not null,
  manual_conversion_quantity numeric(14,4),
  manual_conversion_unit text,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null,
  active boolean not null default true,
  counter_price numeric(14,2),
  ifood_price numeric(14,2),
  bysell_price numeric(14,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name, category)
);

create table if not exists public.menu_item_components (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  component_type text not null check (component_type in ('recipe','ingredient')),
  recipe_id uuid references public.recipes(id),
  ingredient_id uuid references public.ingredients(id),
  quantity numeric(14,4) not null default 1 check (quantity > 0),
  unit text,
  created_at timestamptz not null default now(),
  check ((component_type='recipe' and recipe_id is not null and ingredient_id is null) or (component_type='ingredient' and ingredient_id is not null and recipe_id is null))
);

create table if not exists public.operating_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  expense_date date not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  cost_type text not null check (cost_type in ('fixed','variable')),
  category text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sale_date date not null,
  menu_item_id uuid not null references public.menu_items(id),
  channel text not null check (channel in ('counter','ifood','bysell','other')),
  quantity numeric(14,4) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  target_net_margin numeric(7,4) not null default 0.20,
  ifood_fee numeric(7,4) not null default 0,
  bysell_fee numeric(7,4) not null default 0,
  monthly_sales_estimate numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid());
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_purchases enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_item_components enable row level security;
alter table public.operating_costs enable row level security;
alter table public.sales enable row level security;
alter table public.business_settings enable row level security;

create policy "members read organizations" on public.organizations for select using (public.is_org_member(id));
create policy "members read memberships" on public.organization_members for select using (user_id=auth.uid() or public.is_org_member(organization_id));

-- Política inicial: qualquer membro da organização pode ler e editar.
-- Depois podemos separar admin/editor/viewer com regras mais restritas.
do $$
declare t text;
begin
  foreach t in array array['ingredients','ingredient_purchases','recipes','recipe_items','menu_items','menu_item_components','operating_costs','sales','business_settings'] loop
    execute format('create policy "org members select %1$s" on public.%1$I for select using (public.is_org_member(organization_id))', t);
    execute format('create policy "org members insert %1$s" on public.%1$I for insert with check (public.is_org_member(organization_id))', t);
    execute format('create policy "org members update %1$s" on public.%1$I for update using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))', t);
    execute format('create policy "org members delete %1$s" on public.%1$I for delete using (public.is_org_member(organization_id))', t);
  end loop;
end $$;

create index if not exists ingredient_purchases_lookup on public.ingredient_purchases(organization_id, ingredient_id, purchase_date);
create index if not exists sales_lookup on public.sales(organization_id, sale_date, menu_item_id);
create index if not exists operating_costs_lookup on public.operating_costs(organization_id, expense_date, cost_type);
