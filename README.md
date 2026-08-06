# Cia do Caldinho — projeto React executável

Esta pasta já é o projeto. Não abra o ZIP diretamente: extraia tudo e use `INICIAR-PROJETO.bat` no Windows, ou execute `npm install` e `npm run dev` nesta pasta.

# Cia. do Caldinho — Gestão

Fase 1 da migração do sistema para React + Vercel + Supabase.

## O que já está pronto

- Estrutura React + TypeScript organizada por páginas e serviços.
- Cliente Supabase configurável por variáveis de ambiente.
- Tela de login com Supabase Auth.
- Esquema SQL inicial com organizações, usuários, insumos, compras, receitas, cardápio, custos e vendas.
- Row Level Security preparada para separar os dados por organização.
- Configuração para Vercel.
- Sistema HTML anterior preservado em `public/legacy/index.html`.

## Rodar localmente

1. Instale Node.js 20 ou superior.
2. Execute `npm install`.
3. Copie `.env.example` para `.env.local`.
4. Preencha URL e chave anônima do Supabase.
5. Execute `npm run dev`.

Sem variáveis do Supabase, o projeto abre em modo de preparação e não exige login.

## Criar o banco

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Execute `supabase/migrations/001_initial_schema.sql`.
4. Crie os usuários em Authentication.
5. Crie uma organização e associe os usuários em `organization_members`.

Exemplo:

```sql
insert into public.organizations (name) values ('Cia. do Caldinho') returning id;

insert into public.organization_members (organization_id, user_id, role)
values ('ID_DA_ORGANIZACAO', 'ID_DO_USUARIO', 'admin');
```

## Publicar na Vercel

1. Envie esta pasta para um repositório GitHub.
2. Importe o repositório na Vercel.
3. Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente.
4. Faça o deploy.

## Migração gradual

O sistema antigo continua disponível na rota `/sistema-atual`. Os próximos módulos a migrar são:

1. Insumos e histórico de compras.
2. Receitas e conversões.
3. Cardápio e precificação.
4. Custos, vendas e DRE.
5. Inteligência e comparativos.

## Versão 2 — Design System

Esta versão adiciona a identidade visual definitiva do ERP: sidebar responsiva, topbar, página de login, cartões de indicadores, tabelas, botões, estados vazios e páginas-base padronizadas. A lógica dos módulos continua para a próxima etapa.

## Versão 3 — módulo Insumos

O módulo **Insumos** agora usa as tabelas `ingredients` e `ingredient_purchases` do Supabase.

Funcionalidades:
- cadastro de insumo com primeira compra;
- nova compra em insumo existente;
- histórico mensal;
- edição e exclusão de compras;
- exclusão de insumo;
- conversão automática entre kg/g/mg e L/ml;
- média ponderada mensal pela quantidade;
- filtro por competência;
- busca e exportação CSV.

Não é necessário executar um novo SQL se a migração `001_initial_schema.sql` já foi aplicada.
