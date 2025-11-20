import { GoogleGenAI } from "@google/genai";
import { EventInquiry } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateConsultationPreview = async (data: EventInquiry): Promise<string> => {
  try {
    const prompt = `
      Ajo como a Elsa Cruz, uma organizadora de eventos de luxo e prestígio em Portugal.
      Recebi o seguinte pedido de informações através do meu site exclusivo:
      
      Nome do Cliente: ${data.name}
      Tipo de Evento: ${data.eventType}
      Data Pretendida: ${data.date}
      Local: ${data.location}
      Nº Convidados: ${data.guestCount}
      Orçamento: ${data.budget || "Não especificado"}
      Estilo/Visão do Cliente: ${data.stylePreferences}
      Serviços Solicitados: ${data.servicesNeeded.join(', ')}
      Notas Adicionais: ${data.details}

      Tarefa:
      Escreve uma resposta curta e muito elegante (máximo 3 parágrafos curtos) dirigida diretamente ao cliente.
      
      Objetivos da resposta:
      1. Agradecer o contacto com distinção.
      2. Comentar positivamente a visão/estilo do cliente ("${data.stylePreferences}"), sugerindo brevemente como podemos tornar isso mágico e único.
      3. Transmitir confiança e exclusividade, terminando com uma nota de que entrarei em contacto brevemente para uma reunião.

      Tom de voz:
      Português de Portugal (PT-PT) impecável, formal mas caloroso ("tu" ou "você" conforme apropriado para luxo, geralmente "você" ou tratamento impessoal elegante), glamoroso e confiante.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Obrigada pelo seu amável contacto. Recebemos o seu pedido e entraremos em breve em contacto para desenhar o seu evento de sonho.";
  } catch (error) {
    console.error("Error generating response:", error);
    return "Obrigada pelo seu amável contacto. Recebemos o seu pedido e entraremos em breve em contacto para desenhar o seu evento de sonho.";
  }
};
