-- Adiciona flag de primeira entrada à tabela salao_config.
-- Seguro para rodar em banco já configurado — salões existentes recebem true por padrão,
-- o que fará o modal "Primeiros passos" aparecer na próxima entrada de cada salão.
-- Se preferir não mostrar o modal para salões já configurados, rode a linha UPDATE abaixo.

alter table public.salao_config
  add column if not exists primeira_vez boolean not null default true;

-- Opcional: marcar salões já existentes como "já viram" o modal
-- update public.salao_config set primeira_vez = false;
