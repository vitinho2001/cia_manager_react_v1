@echo off
setlocal
cd /d "%~dp0"

echo ==============================================
echo Cia. do Caldinho - Exportacao de Receitas
echo ==============================================
echo.

if not exist package.json (
  echo ERRO: coloque este arquivo e receitas-exportacao.patch na raiz do projeto.
  echo A pasta correta deve conter package.json e a pasta src.
  pause
  exit /b 1
)

if not exist receitas-exportacao.patch (
  echo ERRO: receitas-exportacao.patch nao encontrado nesta pasta.
  pause
  exit /b 1
)

echo [1/3] Verificando compatibilidade da atualizacao...
git apply --check receitas-exportacao.patch
if errorlevel 1 (
  echo.
  echo A atualizacao nao pode ser aplicada automaticamente nesta versao.
  echo Nenhum arquivo foi alterado.
  pause
  exit /b 1
)

echo [2/3] Aplicando atualizacao...
git apply receitas-exportacao.patch
if errorlevel 1 (
  echo ERRO ao aplicar a atualizacao.
  pause
  exit /b 1
)

echo [3/3] Testando build de producao...
call npm run build
if errorlevel 1 (
  echo.
  echo O patch foi aplicado, mas o build encontrou um erro.
  echo Rode: git restore src/pages/RecipesPage.tsx
  echo para desfazer somente esta alteracao.
  pause
  exit /b 1
)

echo.
echo ==============================================
echo ATUALIZACAO APLICADA COM SUCESSO.
echo ==============================================
echo Agora abra o GitHub Desktop.
echo Voce vera RecipesPage.tsx em Changes.
echo Commit sugerido: Adicionar exportacao de receitas
echo Depois clique em Push origin.
echo.
pause
