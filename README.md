# Pocket Offline

App local (sem backend) para gerenciar seu backup do Pocket em CSV.

## Stack
- Vite + React + TypeScript
- IndexedDB (persistencia local no navegador)
- Tailwind v4 + shadcn/ui
- Biome

## Funcionalidades
- Importar CSV do Pocket (`title,url,time_added,tags,status`)
- Exportar CSV atualizado
- Cadastro manual de post
- Lista de posts em modo cards ou lista
- Filtros: todos, unread, archive, favoritos, tags e busca
- Favoritar e arquivar/desarquivar itens
- Leitor do post com modo `clean` e `original`
- Tudo salvo offline no IndexedDB

## Rodar projeto
```bash
npm install
npm run dev
```

## Qualidade
```bash
npm run biome:check
npm run build
```

## Observacoes
- A leitura `clean` tenta extrair artigo direto da URL e usa fallback quando houver bloqueio de CORS.
- Como nao existe backend, tudo fica salvo apenas no navegador/dispositivo atual.
