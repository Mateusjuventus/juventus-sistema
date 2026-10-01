-- Mesmo problema que a 0118 corrigiu nas Lesões, só que nas Queixas: o UPDATE por atleta_id +
-- descrição da 0116 rodou sem erro mas não encontrou correspondência em boa parte das 81 linhas —
-- só que como fisioterapia_queixas.tipo já tinha valor antes (nunca ficava null), a conferência da
-- 0116 não detectava isso (só checava "sem tipo", não "tipo errado"). O Mateus notou olhando o PDF:
-- queixas que deviam ser "Dor tendínea/fascial" ou "Lesão ligamentar" continuavam mostrando "Dor
-- articular" (o valor antigo). Corrige as 81 diretamente pelo id (visto num export CSV da tabela),
-- sem depender de comparar texto nenhum — mesma solução da 0118.

update public.fisioterapia_queixas set tipo = 'articular' where id = '5ef9e969-0679-48f6-b720-74a2763aa941';         -- 4º dedo da mão esquerda
update public.fisioterapia_queixas set tipo = 'osseo' where id = '4d93ff79-9e0a-4617-bc80-bc3d0934eb55';              -- canelite bilateral
update public.fisioterapia_queixas set tipo = 'osseo' where id = '341bcb1d-b6e9-42d2-9e5a-40b304123db8';              -- desconforto na região do calcâneo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '6cce1357-dc65-48a3-9b02-9a1d4036d6c4';         -- desconforto na região torácica E
update public.fisioterapia_queixas set tipo = 'ligamentar' where id = '858b0cd1-a18b-4c38-8992-f68b3dc82011';        -- desconforto no Ligamento Colateral Lateral joelho E
update public.fisioterapia_queixas set tipo = 'ligamentar' where id = 'e3f56ab0-bd63-4500-ae9e-8af36a78b611';        -- desconforto no Ligamento Colateral Medial do joelho E
update public.fisioterapia_queixas set tipo = 'articular' where id = '39ff0d7e-5c28-40b6-9747-2f88934cd5a9';         -- desconforto no pé D
update public.fisioterapia_queixas set tipo = 'articular' where id = 'ea2cc689-61c9-49c0-bfc9-f478a6654419';         -- desconforto no pé E
update public.fisioterapia_queixas set tipo = 'articular' where id = 'b3588312-2392-4b31-971a-b999400f0b71';         -- desconforto no pé E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'e35c514c-b21d-473e-8a5f-019fe3f7c2c6';          -- desconforto no reto femoral D
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '87831bff-56e0-4ec4-8b50-80602cac5c04';  -- desconforto no tendão patelar D
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = 'f2e30c1b-a6e4-4460-a8ab-c6cd4401825b';  -- desconforto no tendão patelar E
update public.fisioterapia_queixas set tipo = 'articular' where id = '7146d91c-4ce4-467d-b923-801925115ea6';         -- desconforto no tornozelo D
update public.fisioterapia_queixas set tipo = 'articular' where id = '301fad6e-747b-4164-a514-45a740594ba5';         -- desconforto no tornozelo E
update public.fisioterapia_queixas set tipo = 'articular' where id = 'a9a3b449-3c3b-46e3-b867-cf64efa9ca1c';         -- desconforto no tornozelo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '0fd913d7-e8f3-4a80-a00c-0ed4dfd0d55d';         -- desconforto no tornozelo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '7e5e067c-9faf-489d-8fd3-e53167786135';         -- desconforto no tornozelo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '2e71b00c-7675-439d-b72f-c2f0f41d9a0e';         -- desconforto nos tornozelos D e E
update public.fisioterapia_queixas set tipo = 'articular' where id = 'e80fbec2-129a-4309-bdcb-5dfdd4526de5';         -- desconforto pé D
update public.fisioterapia_queixas set tipo = 'articular' where id = '560a0193-94fb-4d86-8a37-88f98329775a';         -- desconforto pé D
update public.fisioterapia_queixas set tipo = 'articular' where id = 'e45d3d33-648d-4a7f-b25f-3355a41564f3';         -- desconforto pé E
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '692a3019-8b64-4a51-a927-8e4fbdc86185';  -- desconforto próximo à pata de ganso D
update public.fisioterapia_queixas set tipo = 'osseo' where id = '4254ff1d-8975-4b68-b125-e39a017b7a6e';             -- desconforto região da fíbula D
update public.fisioterapia_queixas set tipo = 'articular' where id = '216cee90-d11c-40bd-896e-56e2763af987';         -- desconforto região torácica E
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = 'edb1d05c-b824-4563-86d2-62523f739c70';  -- desconforto tendão calcâneo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '229af74e-5921-4507-ada8-3438e7056fb1';         -- desconforto tornozelo D
update public.fisioterapia_queixas set tipo = 'articular' where id = '47a874f7-3204-49cc-9287-9b82720e7da6';         -- desconforto tornozelo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '904f8192-6a19-4c73-a089-3c4ce2085cfd';         -- dor ombro E
update public.fisioterapia_queixas set tipo = 'muscular' where id = '64ba389d-d197-4cd4-9d3b-c12bd3046b19';          -- fadiga muscular em membros inferiores
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '4ca9ee8b-098f-4e34-bee7-4518b57732b1';  -- fasceite plantar bilateral
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = 'a8bfa9ef-ea92-4127-9c64-6316e1d6bacf';  -- fasceite plantar bilateral
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '0a47257b-969e-4582-8531-42d7517aaf9e';  -- fasceite plantar D
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '18c64d9f-7c3e-4392-865d-858035a61a1d';  -- fasceite plantar D
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '20bd87c6-c0b3-43fe-bc23-0482c65d263c';  -- fasceite plantar E
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = 'fae69882-78c2-4678-ad21-3bb797a12e5d';  -- fasceite plantar E
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '4e4e209a-8efc-4f1e-9253-f75192394d23';  -- fasceite plantar E
update public.fisioterapia_queixas set tipo = 'articular' where id = '83cbe50b-0310-4f48-ad02-cb580ee34833';         -- incômodo cotovelo E
update public.fisioterapia_queixas set tipo = 'articular' where id = '32753b73-7cca-4727-8b91-29cf1e782339';         -- incômodo ombro E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'bd0b87a7-4e9b-49ba-9b8f-8423c7fe692d';          -- incômodo panturrilha bilateral
update public.fisioterapia_queixas set tipo = 'articular' where id = '3a3ca274-0cb8-48e1-99b3-7a2958dcc825';         -- lombalgia
update public.fisioterapia_queixas set tipo = 'articular' where id = 'cc067d23-78e8-470e-bd1a-9667b3555a85';         -- lombalgia lado E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'eeace4d5-4a83-4f72-bcf0-662d37706107';          -- mialgia adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'eda8e6ee-7576-4bc0-8675-f3655c1998f2';          -- mialgia adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '060faaba-52a2-4adb-81ee-52750aaa2540';          -- mialgia adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '0065bf0e-36a3-4938-8c44-8e8275a599b2';          -- mialgia adutor E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'b0c914c0-6448-4b3a-922c-c3de12c36839';          -- mialgia adutor E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'a712aeab-e1c8-40f3-a487-21128301c13e';          -- mialgia bíceps femoral D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '5190100b-ec3c-49e3-8a05-ff5374616eac';          -- mialgia lombar
update public.fisioterapia_queixas set tipo = 'muscular' where id = '94f1d6ce-6c67-4cc6-8f8f-9c986375176a';          -- mialgia na panturrilha D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '43c94d77-1b4d-4296-a559-67d0526ab376';          -- mialgia na panturrilha D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '2a4f0c36-48ff-43f8-8477-9ef4fd96fa41';          -- mialgia na panturrilha D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '1584e6f4-8c29-4424-9688-3ef42dd01f16';          -- mialgia na panturrilha E
update public.fisioterapia_queixas set tipo = 'muscular' where id = '2001710a-76da-4591-8480-1473500d1fd0';          -- mialgia na posterior D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '8b1d40c9-b3af-41bc-adfe-145052ab065a';          -- mialgia na posterior D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '6168a51b-ee89-4c13-b173-881394e16412';          -- mialgia na posterior E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'ebd5a3dc-6c0f-4b30-a611-0cc4798cb144';          -- mialgia na região posterior E
update public.fisioterapia_queixas set tipo = 'muscular' where id = '0b832979-5d37-49ae-8c35-628461ce8477';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '8ddcfa6e-ea79-449e-9a71-3057463a366a';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '907c533c-9380-4c43-b146-2181f30d8a05';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'c1f9685b-2179-433d-b8a6-bb9ef117eb24';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'da5db6ca-7bd2-4cb9-bd0d-dec521ffb1d7';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '2b31cd67-3dd2-4032-816f-3a70620873cf';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'b3058e3f-1b88-4d91-8d17-00ff60148f47';          -- mialgia no adutor D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '4dcd8fd0-f990-4c0e-9286-d3d40511ff51';          -- mialgia no adutor E
update public.fisioterapia_queixas set tipo = 'muscular' where id = '3161df9e-c24e-4b91-89ae-a5d79e09474b';          -- mialgia no glúteo E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'ebe8125a-9fd4-489b-a0b5-ef781086b8c4';          -- mialgia no iliopsoas D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '3c17d064-f2fe-4ae2-b8fc-69bc35fb3c21';          -- mialgia no reto femoral D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '82f1b17b-7a7e-4d95-8423-90f2cbb73537';          -- mialgia no reto femoral D
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'e8d73d38-9159-4aac-b72f-23ed0a2e57bc';          -- mialgia no reto femoral D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '78365ccc-29fa-458f-a9bc-a123eeac607b';          -- mialgia panturrilha D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '25731da2-568f-492e-a339-df91213e9551';          -- mialgia posterior D
update public.fisioterapia_queixas set tipo = 'muscular' where id = '605b53f7-cfb2-438d-b746-bbbb7d7d7103';          -- mialgia posterior E
update public.fisioterapia_queixas set tipo = 'muscular' where id = '9ec5def3-51a7-4feb-af4b-433f7934a47a';          -- mialgia posterior E
update public.fisioterapia_queixas set tipo = 'muscular' where id = '7dc5acd7-9df4-461f-9250-ca8ff295ba30';          -- mialgia posterior E
update public.fisioterapia_queixas set tipo = 'muscular' where id = 'd751c489-d812-492d-8c48-2ce188d45a42';          -- mialgia reto femoral D
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '30d517c1-a4f0-4e5d-ab5e-ff5408b7984b';  -- tendinite patelar joelho D
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = '98b16065-98ce-4cbf-9462-2163e14ff03e';  -- tendinite patelar joelho E
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = 'fc68d671-8548-4984-b6f8-82cc5e668198';  -- tendinite patelar joelho E
update public.fisioterapia_queixas set tipo = 'tendinea_fascial' where id = 'ab6054c0-675e-4fa0-b5d5-de84ed833943';  -- tendinite patelar joelho E
update public.fisioterapia_queixas set tipo = 'articular' where id = 'de3d4155-57f3-454a-83b5-4ff8e8020968';         -- torcicolo
update public.fisioterapia_queixas set tipo = 'trauma' where id = 'bb9858cb-c227-43fa-b777-d21e3d7d4ab4';            -- trauma tornozelo D

-- Confira: deve devolver as 6 categorias com essas contagens (batendo com o relatório em papel):
-- muscular 37, articular 23, tendinea_fascial 15, osseo 3, ligamentar 2, trauma 1.
select tipo, count(*) from public.fisioterapia_queixas group by tipo order by count(*) desc;

notify pgrst, 'reload schema';
