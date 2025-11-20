import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calendar, Users, MapPin, Star, Heart, Check, 
  Instagram, Mail, Phone, ChevronDown, Loader2, Sparkles,
  X, ZoomIn
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURAÇÃO ---
const EMAILJS_SERVICE_ID = "service_7n4fupk"; 
const EMAILJS_TEMPLATE_ID = "template_htcqtak";
const EMAILJS_PUBLIC_KEY = "X7k_93aJx_aXL6fbA";

// --- TIPOS E DADOS (Anteriormente em types.ts) ---
export enum EventType {
  CASAMENTO = 'Casamento',
  BATIZADO = 'Batizado',
  CHA_DE_BEBE = 'Chá de Bebé',
  CHA_REVELACAO = 'Chá Revelação',
  ANIVERSARIO = 'Aniversário',
  OUTRO = 'Outro',
}

export interface EventInquiry {
  name: string;
  email: string;
  phone: string;
  eventType: EventType;
  date: string;
  location: string;
  guestCount: number;
  budget?: string;
  stylePreferences: string;
  servicesNeeded: string[];
  details: string;
}

export const SERVICE_OPTIONS = [
  "Planeamento Completo",
  "Decoração & Design",
  "Coordenação do Dia",
  "Design Floral",
  "Consultoria de Imagem",
  "Gestão de Fornecedores"
];

// --- SERVIÇO GEMINI AI (Anteriormente em services/geminiService.ts) ---
// Nota: Na Vercel, process.env.API_KEY precisa ser configurado nas variáveis de ambiente do projeto.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generateConsultationPreview = async (data: EventInquiry): Promise<string> => {
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

// --- COMPONENTE PRINCIPAL ---

// Mock Data for Gallery
const GALLERY_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'tables', label: 'Decoração de Mesas' },
  { id: 'cakes', label: 'Bolos & Doces' },
  { id: 'invites', label: 'Convites' },
  { id: 'favors', label: 'Lembranças' }
];

const GALLERY_ITEMS = [
  { 
    id: 1, 
    category: 'tables', 
    img: 'https://images.unsplash.com/photo-1519225421980-715cb0202128?q=80&w=2070&auto=format&fit=crop',
    title: 'Mesa Imperial Dourada'
  },
  { 
    id: 2, 
    category: 'cakes', 
    img: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?q=80&w=1000&auto=format&fit=crop',
    title: 'Bolo Minimalista Floral'
  },
  { 
    id: 3, 
    category: 'invites', 
    img: 'https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?q=80&w=1000&auto=format&fit=crop',
    title: 'Stationery Caligrafia'
  },
  { 
    id: 4, 
    category: 'tables', 
    img: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?q=80&w=2070&auto=format&fit=crop',
    title: 'Centro de Mesa Rústico'
  },
  { 
    id: 5, 
    category: 'favors', 
    img: 'https://images.unsplash.com/photo-1549482199-bc1ca6f58502?q=80&w=1000&auto=format&fit=crop',
    title: 'Lembranças Personalizadas'
  },
  { 
    id: 6, 
    category: 'cakes', 
    img: 'https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?q=80&w=1000&auto=format&fit=crop',
    title: 'Detalhes em Açúcar'
  },
  { 
    id: 7, 
    category: 'tables', 
    img: 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?q=80&w=2070&auto=format&fit=crop',
    title: 'Jantar à Luz das Velas'
  },
  { 
    id: 8, 
    category: 'invites', 
    img: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop',
    title: 'Convite Clássico Lacrado'
  },
  { 
    id: 9, 
    category: 'favors', 
    img: 'https://images.unsplash.com/photo-1602665742701-389671bc24c5?q=80&w=1000&auto=format&fit=crop',
    title: 'Velas Aromáticas'
  },
  { 
    id: 10, 
    category: 'tables', 
    img: 'https://images.unsplash.com/photo-1505944357431-27579db4f924?q=80&w=1000&auto=format&fit=crop',
    title: 'Arranjo Floral Suspenso'
  },
  { 
    id: 11, 
    category: 'cakes', 
    img: 'https://images.unsplash.com/photo-1562777717-dc6984f65a63?q=80&w=1000&auto=format&fit=crop',
    title: 'Bolo Texturizado'
  },
  { 
    id: 12, 
    category: 'invites', 
    img: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=1000&auto=format&fit=crop',
    title: 'Menu Personalizado'
  }
];

const App = () => {
  const [formState, setFormState] = useState<EventInquiry>({
    name: '',
    email: '',
    phone: '',
    eventType: EventType.CASAMENTO,
    date: '',
    location: '',
    guestCount: 50,
    budget: '',
    stylePreferences: '',
    servicesNeeded: [],
    details: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState<typeof GALLERY_ITEMS[0] | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (service: string) => {
    setFormState(prev => {
      const exists = prev.servicesNeeded.includes(service);
      if (exists) {
        return { ...prev, servicesNeeded: prev.servicesNeeded.filter(s => s !== service) };
      } else {
        return { ...prev, servicesNeeded: [...prev.servicesNeeded, service] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Enviar E-mail
      if (EMAILJS_PUBLIC_KEY) {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_name: "Elsa Cruz",
            from_name: formState.name,
            from_email: formState.email,
            phone: formState.phone,
            event_type: formState.eventType,
            date: formState.date,
            location: formState.location,
            guest_count: formState.guestCount,
            services: formState.servicesNeeded.join(', '),
            message: formState.details,
            style: formState.stylePreferences
          },
          EMAILJS_PUBLIC_KEY
        );
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 2. Gerar Resposta IA
      const response = await generateConsultationPreview(formState);
      setAiResponse(response);

    } catch (error) {
      console.error("Erro ao enviar:", error);
      setAiResponse("Obrigada pelo contacto. Entraremos em contacto brevemente para confirmar todos os detalhes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredGallery = activeCategory === 'all' 
    ? GALLERY_ITEMS 
    : GALLERY_ITEMS.filter(item => item.category === activeCategory);

  return (
    <div className="min-h-screen font-serif text-stone-800 bg-stone-50 selection:bg-gold-300 selection:text-gold-900">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gold-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-display text-2xl font-bold text-gold-700 tracking-widest">
            ELSA CRUZ
          </div>
          <div className="hidden md:flex space-x-8 font-sans text-sm uppercase tracking-wider text-stone-600">
            <a href="#sobre" className="hover:text-gold-700 transition-colors">Sobre</a>
            <a href="#portfolio" className="hover:text-gold-700 transition-colors">Portfólio</a>
            <button onClick={scrollToForm} className="text-gold-700 font-bold hover:text-gold-900 transition-colors">
              Agendar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop" 
            alt="Elegant wedding table setting" 
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-stone-900/20 to-stone-50"></div>
        </div>

        <div className="relative z-10 text-center px-6 fade-in max-w-4xl">
          <div className="mb-4 flex justify-center">
             <div className="h-16 w-16 border-2 border-white/80 rounded-full flex items-center justify-center">
                <span className="font-display text-3xl text-white">E</span>
             </div>
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-white font-medium tracking-wide mb-6 drop-shadow-lg">
            Momentos Eternos
          </h1>
          <p className="font-sans text-lg md:text-xl text-white/90 font-light tracking-widest mb-12 max-w-2xl mx-auto">
            Planeamento exclusivo de casamentos e eventos em Portugal.
            <br />
            Elegância. Detalhe. Paixão.
          </p>
          <button 
            onClick={scrollToForm}
            className="bg-white/10 backdrop-blur-md border border-white/50 text-white hover:bg-white hover:text-gold-900 px-10 py-4 rounded-sm font-sans uppercase tracking-widest text-sm transition-all duration-300"
          >
            Começar a Planear
          </button>
        </div>

        <div className="absolute bottom-10 w-full flex justify-center animate-bounce">
          <ChevronDown className="text-white/70 w-8 h-8" />
        </div>
      </header>

      {/* About Section */}
      <section id="sobre" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <div className="relative p-4 border border-gold-300/50">
               <img 
                src="https://images.unsplash.com/photo-1523438885200-e635ba2c371e?q=80&w=988&auto=format&fit=crop" 
                alt="Detalhes de planeamento" 
                className="w-full h-[500px] object-cover"
              />
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-gold-100 -z-10"></div>
            </div>
          </div>
          <div className="order-1 md:order-2 text-center md:text-left">
            <h2 className="font-display text-4xl text-gold-900 mb-8">A Arte de Celebrar</h2>
            <p className="text-stone-600 leading-relaxed mb-6 text-lg">
              Sou a Elsa Cruz, e acredito que cada celebração deve ser um reflexo autêntico da vossa história. 
              Com anos de experiência em design de eventos, transformo sonhos em realidade através de um planeamento meticuloso e um olhar atento ao design.
            </p>
            <p className="text-stone-600 leading-relaxed mb-8 text-lg">
              Seja um casamento íntimo numa quinta no Douro, um batizado delicado ou uma festa de aniversário glamorosa, 
              o meu compromisso é criar uma atmosfera de sofisticação e beleza intemporal.
            </p>
            <div className="flex justify-center md:justify-start space-x-8 text-gold-700 font-display">
              <div className="text-center">
                <span className="block text-3xl mb-1">50+</span>
                <span className="text-xs uppercase tracking-widest text-stone-500">Casamentos</span>
              </div>
              <div className="text-center">
                <span className="block text-3xl mb-1">100%</span>
                <span className="text-xs uppercase tracking-widest text-stone-500">Dedicação</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio Highlights */}
      <section id="portfolio" className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="font-sans uppercase tracking-widest text-gold-600 text-sm">O Nosso Trabalho</span>
            <h2 className="font-display text-4xl text-stone-900 mt-3">Portfólio Selecionado</h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {GALLERY_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-6 py-2 rounded-full font-sans text-sm uppercase tracking-wider transition-all duration-300 ${
                  activeCategory === category.id
                    ? 'bg-gold-700 text-white shadow-lg'
                    : 'bg-white text-stone-500 hover:bg-gold-50 border border-stone-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Gallery Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {filteredGallery.map((item) => (
              <div 
                key={item.id} 
                className="group relative h-80 bg-white overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-500"
                onClick={() => setSelectedImage(item)}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10"></div>
                <img 
                  src={item.img} 
                  alt={item.title} 
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="flex items-center justify-between text-white">
                    <span className="font-display text-xl">{item.title}</span>
                    <ZoomIn className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity delay-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 text-white/70 hover:text-white">
            <X className="w-10 h-10" />
          </button>
          <div className="max-w-5xl w-full max-h-[90vh] relative" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage.img} 
              alt={selectedImage.title} 
              className="w-full h-full object-contain max-h-[85vh] shadow-2xl"
            />
            <div className="mt-4 text-center">
              <h3 className="font-display text-2xl text-white">{selectedImage.title}</h3>
              <p className="text-white/60 font-sans uppercase tracking-widest text-sm mt-2">
                {GALLERY_CATEGORIES.find(c => c.id === selectedImage.category)?.label}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Form */}
      <section ref={formRef} className="py-24 px-6 bg-stone-100" id="contact">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-16 shadow-xl border-t-4 border-gold-500">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl text-gold-900">Solicitar Orçamento</h2>
            <p className="text-stone-500 mt-4 font-light">Conte-me sobre o seu dia especial. Responderei em breve com uma proposta personalizada.</p>
          </div>

          {aiResponse ? (
            <div className="bg-gold-50 p-8 border border-gold-200 text-center animate-fade-in">
              <Sparkles className="w-12 h-12 text-gold-500 mx-auto mb-4" />
              <h3 className="font-display text-2xl text-gold-900 mb-4">Mensagem Recebida</h3>
              <p className="text-stone-700 whitespace-pre-line leading-relaxed mb-6">
                {aiResponse}
              </p>
              <button 
                onClick={() => {
                  setAiResponse(null);
                  setFormState({
                    name: '', email: '', phone: '', eventType: EventType.CASAMENTO,
                    date: '', location: '', guestCount: 50, budget: '',
                    stylePreferences: '', servicesNeeded: [], details: ''
                  });
                }}
                className="text-sm font-bold text-gold-700 hover:text-gold-900 uppercase tracking-widest border-b border-gold-300 pb-1"
              >
                Enviar novo pedido
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Nome Completo</label>
                  <input 
                    required
                    name="name"
                    value={formState.name}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Email</label>
                  <input 
                    required
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Telemóvel</label>
                  <input 
                    required
                    name="phone"
                    value={formState.phone}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                    placeholder="+351 912 345 678"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Tipo de Evento</label>
                  <select 
                    name="eventType"
                    value={formState.eventType}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                  >
                    {Object.values(EventType).map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Data (Estimada)</label>
                  <input 
                    type="date"
                    name="date"
                    value={formState.date}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Nº Convidados</label>
                  <input 
                    type="number"
                    name="guestCount"
                    value={formState.guestCount}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Orçamento (Opcional)</label>
                  <input 
                    name="budget"
                    value={formState.budget}
                    onChange={handleInputChange}
                    className="w-full border-b border-stone-300 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent"
                    placeholder="Ex: 20.000€"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-4">Serviços Necessários</label>
                <div className="grid md:grid-cols-2 gap-4">
                  {SERVICE_OPTIONS.map(service => (
                    <div 
                      key={service}
                      onClick={() => handleServiceToggle(service)}
                      className={`cursor-pointer p-4 border transition-all duration-300 flex items-center space-x-3 ${
                        formState.servicesNeeded.includes(service) 
                          ? 'border-gold-500 bg-gold-50 text-gold-900' 
                          : 'border-stone-200 hover:border-gold-300'
                      }`}
                    >
                      <div className={`w-5 h-5 border flex items-center justify-center ${
                        formState.servicesNeeded.includes(service) ? 'border-gold-500 bg-gold-500 text-white' : 'border-stone-300'
                      }`}>
                        {formState.servicesNeeded.includes(service) && <Check className="w-3 h-3" />}
                      </div>
                      <span className="text-sm font-sans">{service}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-stone-500 mb-2">Visão & Detalhes</label>
                <textarea 
                  required
                  name="details"
                  value={formState.details}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full border border-stone-300 p-3 focus:border-gold-500 outline-none transition-colors bg-transparent resize-none"
                  placeholder="Conte-me mais sobre o seu sonho..."
                />
              </div>

              <div className="text-center pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gold-700 text-white px-12 py-4 text-sm uppercase tracking-widest hover:bg-gold-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>A Enviar...</span>
                    </>
                  ) : (
                    <span>Enviar Pedido</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 text-white py-16 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-center md:text-left">
          <div>
            <div className="font-display text-2xl font-bold text-gold-300 mb-6">ELSA CRUZ</div>
            <p className="text-stone-400 text-sm leading-relaxed">
              Criando memórias inesquecíveis através de design excecional e planeamento irrepreensível.
            </p>
          </div>
          <div>
            <h4 className="font-sans text-xs uppercase tracking-widest text-gold-500 mb-6">Contactos</h4>
            <div className="space-y-4 text-stone-300">
              <div className="flex items-center justify-center md:justify-start space-x-3 group cursor-pointer hover:text-white">
                <Mail className="w-4 h-4 text-gold-600" />
                <span>geral@elsacruz.pt</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-3 group cursor-pointer hover:text-white">
                <Instagram className="w-4 h-4 text-gold-600" />
                <span>@elsacruzeventos</span>
              </div>
              <div className="flex items-center justify-center md:justify-start space-x-3 group cursor-pointer hover:text-white">
                <Phone className="w-4 h-4 text-gold-600" />
                <span>+351 912 345 678</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-sans text-xs uppercase tracking-widest text-gold-500 mb-6">Áreas</h4>
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {['Porto', 'Douro', 'Lisboa', 'Algarve'].map(area => (
                <span key={area} className="text-xs border border-stone-700 px-3 py-1 text-stone-400">
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-16 pt-8 border-t border-white/5 text-center text-stone-600 text-xs">
          &copy; {new Date().getFullYear()} Elsa Cruz Eventos. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);