-- A reclassificação por texto (descrição) da migração 0116 não "pegou" nas 20 lesões vindas do
-- histórico importado — o UPDATE por atleta_id + descrição não deu erro (não é erro comparar e não
-- achar nada), só silenciosamente não encontrou correspondência, provavelmente por algum caractere
-- invisível diferente entre o texto gravado no banco e o texto deste script (às 3 lesões "ativas"
-- da migração 0114 e às 81 queixas isso não aconteceu — só nessas 20). Pra eliminar de vez esse
-- tipo de risco, esta migração corrige as mesmas 20 linhas direto pelo `id` (visto na consulta de
-- diagnóstico do Mateus), sem comparar texto nenhum.

update public.fisioterapia_lesoes set tipo = 'muscular'         where id = '58e302d2-7984-4dd3-bfef-d9291fe7d78e';   -- Andrew Lucas Balbino Drummond — lesão grau II de bíceps femoral E
update public.fisioterapia_lesoes set tipo = 'trauma'           where id = 'c602752c-8ba0-4ac6-b213-1521878aee70';   -- Andrew Lucas Balbino Drummond — edema póstero lateral joelho E
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = 'd593856e-12d2-4bc4-ae0d-08eeae98e2c5';   -- Daniel Guedes da Silva — entorse de tornozelo E
update public.fisioterapia_lesoes set tipo = 'osseo'            where id = '345b6420-0845-4da5-a0a7-7c3bd03dd589';   -- Felipe Santos da Silva — fratura do 5º metatarso E
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = 'ec9eb9e2-1ff9-4e6c-a77d-401ddc54f669';   -- Fernando Fonseca Ferreira — entorse de tornozelo E
update public.fisioterapia_lesoes set tipo = 'tendinea_fascial' where id = '31789a69-9af9-4bd4-859c-26200315f2c1';   -- Fernando Fonseca Ferreira — lesão do fibular longo E
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = '1dad91e3-1ead-4a27-879d-a496592eb1fd';   -- Gabriel Luis Gonçalves Felix — entorse de tornozelo E
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = 'f3f3801f-bf64-45ac-a37b-4fc0bef14293';   -- Gabriel Luis Gonçalves Felix — lesão parcial do ligamento cruzado posterior D
update public.fisioterapia_lesoes set tipo = 'trauma'           where id = 'a6379efa-7548-43b9-b654-86c7c222a42c';   -- John Adams Egito da Silva — trauma na panturrilha D
update public.fisioterapia_lesoes set tipo = 'muscular'         where id = 'e58a8928-94c6-4d54-a0cc-26e8725fd0c6';   -- Keven Vinicius Duarte Silva — lesão grau II de reto femoral D
update public.fisioterapia_lesoes set tipo = 'muscular'         where id = 'f927c2f2-52ef-4ddb-84cf-d63914cb290b';   -- Leonardo Henriques Coelho — lesão grau I reto femoral D
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = 'b111eb73-5ef0-48d8-b105-f50ea1ab5924';   -- Lucas dos Santos Lopes — entorse de tornozelo E
update public.fisioterapia_lesoes set tipo = 'muscular'         where id = '1164fdce-52c5-41ef-86db-a4a499e22f6f';   -- Lucas Passarelli — edema no músculo adutor D
update public.fisioterapia_lesoes set tipo = 'trauma'           where id = '9861c932-135a-4e70-952c-25cb80bcb599';   -- Matheus Ferreira de Souza — trauma na perna E
update public.fisioterapia_lesoes set tipo = 'muscular'         where id = 'a0a8a1bc-5ecf-4043-859c-8d2f13cb9dd3';   -- Matheus Ferreira de Souza — lesão grau I no reto femoral D
update public.fisioterapia_lesoes set tipo = 'muscular'         where id = '856572ca-4733-40ed-83a1-880194f4966e';   -- Matheus Ferreira de Souza — edema no músculo reto femoral D
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = 'a8953365-3d53-4a45-8563-af02a032d55e';   -- Matheus Philipe Pereira Leal — entorse de tornozelo D
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = '4dc415e2-e32a-43e8-82ef-0766e8420beb';   -- Maycon Douglas Oliveira Silva — pós-operatório de LCA joelho D
update public.fisioterapia_lesoes set tipo = 'osseo'            where id = '53b723af-ed64-427f-a825-f020ef7b9e5c';   -- Rodrigo Henrique Oliveira Alves — fratura do 4º dedo da mão esquerda
update public.fisioterapia_lesoes set tipo = 'ligamentar'       where id = '07f85cb7-278c-48e4-9596-150f5957ac72';   -- Romário Simões de Oliveira Santos — entorse de tornozelo D

-- Confira: deve devolver 0 antes de rodar a 0117.
select count(*) as lesoes_sem_tipo from public.fisioterapia_lesoes where tipo is null;

notify pgrst, 'reload schema';
