/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  experimental: {
    // Sem isto, o Next recusa (silenciosamente do ponto de vista de quem preenche o formulário) o
    // corpo de qualquer Server Action acima de 1 MB — o padrão da própria ferramenta. Várias telas
    // enviam foto direto num campo de formulário comum (`components/photo-field.tsx`: item de
    // Compra em Solicitações, atleta, staff, comissão técnica, documento...), e uma foto de
    // celular sozinha já costuma passar de 1 MB, então bastava anexar uma foto pra travar o envio
    // inteiro (o formulário fica "carregando" e nunca salva, mesmo preenchido certinho — pedido do
    // Mateus de 16/09 em Solicitações). O redimensionamento de verdade (`uploadFotoRedimensionada`)
    // só acontece DEPOIS que o arquivo original já chegou no servidor, então o limite baixo batia
    // antes disso ter chance de ajudar.
    serverActions: {
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
