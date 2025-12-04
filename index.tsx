import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calendar, Users, MapPin, Star, Heart, Check, 
  Instagram, Mail, Phone, ChevronDown, Loader2, Sparkles,
  X, ZoomIn, ChevronLeft, ChevronRight, Mic, MicOff, Volume2
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from "@google/genai";

// --- CONFIGURAÇÃO ---
const EMAILJS_SERVICE_ID = "service_7n4fupk"; 
const EMAILJS_TEMPLATE_ID = "template_htcqtak";
const EMAILJS_PUBLIC_KEY = "X7k_93aJx_aXL6fbA";

// --- AUDIO UTILS (Live API) ---
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- TIPOS E DADOS ---
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

// --- SERVIÇO GEMINI AI ---
const generateConsultationPreview = async (data: EventInquiry): Promise<string> => {
  // Proteção robusta para obter a API Key sem crashar o browser
  let apiKey = undefined;
  try {
    apiKey = process.env.API_KEY;
  } catch (e) {
    console.warn("Ambiente não suporta process.env diretamente");
  }

  if (!apiKey) {
    console.warn("API Key não encontrada. A usar resposta padrão.");
    return "Obrigada pelo seu amável contacto. Recebemos o seu pedido e entraremos em breve em contacto para desenhar o seu evento de sonho.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const prompt = `
      Ajo como a Elsa Cruz, uma organizadora de eventos no Algarve, Portugal.
      Recebi o seguinte pedido de informações através do meu site:
      
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
      Escreve uma resposta curta, pessoal e calorosa (máximo 3 parágrafos curtos) dirigida diretamente ao cliente.
      
      Objetivos da resposta:
      1. Agradecer o contacto com carinho.
      2. Comentar positivamente a visão do cliente ("${data.stylePreferences}"), mostrando entusiasmo.
      3. Transmitir confiança mas de forma próxima (não corporativa), terminando a dizer que ligarei em breve.

      Tom de voz:
      Português de Portugal (PT-PT). O tom deve ser pessoal, próximo, caloroso e empático, como se estivesse a falar com uma amiga, mas mantendo o profissionalismo e elegância. Evita o "prezado" ou linguagem corporativa excessiva.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Obrigada pelo teu contacto! Adorei a tua ideia e entrarei em breve em contacto para desenharmos juntas este dia especial.";
  } catch (error) {
    console.error("Error generating response:", error);
    return "Obrigada pelo seu contacto. Recebemos o seu pedido e entraremos em breve em contacto.";
  }
};

// --- VOICE WIDGET COMPONENT ---
const VoiceWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isTalking, setIsTalking] = useState(false);
  
  // Refs para manter estado fora do ciclo de renderização do React e evitar closures antigas
  const sessionRef = useRef<any>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Clean up function
  const cleanup = useCallback(() => {
    // Parar sources
    if (sourcesRef.current) {
      sourcesRef.current.forEach(source => {
        try { source.stop(); } catch (e) {}
      });
      sourcesRef.current.clear();
    }
    
    // Fechar contextos
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
      outputContextRef.current = null;
    }

    // Fechar sessão (se existir método close, ou apenas resetar ref)
    // A API atual não expõe .close() explicitamente na promise, mas limpamos a referência.
    sessionRef.current = null;
    
    setStatus('idle');
    setIsTalking(false);
    nextStartTimeRef.current = 0;
  }, []);

  const connect = async () => {
    setStatus('connecting');
    
    let apiKey = undefined;
    try {
      apiKey = process.env.API_KEY;
    } catch (e) {
      console.warn("No API Key");
    }

    if (!apiKey) {
      alert("API Key não configurada para voz.");
      setStatus('error');
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      // Setup Audio Contexts
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;
      
      const outputNode = outputCtx.createGain();
      outputNode.connect(outputCtx.destination);

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Connect to Live API
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Voice session opened');
            setStatus('connected');
            
            // Process Microphone Input
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio Output from Model
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio) {
              setIsTalking(true);
              
              // Ensure output context is running (browsers sometimes suspend it)
              if (outputContextRef.current?.state === 'suspended') {
                await outputContextRef.current.resume();
              }

              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputContextRef.current!.currentTime
              );

              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputContextRef.current!,
                24000,
                1
              );

              const source = outputContextRef.current!.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              
              source.addEventListener('ended', () => {
                 sourcesRef.current.delete(source);
                 if (sourcesRef.current.size === 0) {
                   setIsTalking(false);
                 }
              });

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(src => src.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTalking(false);
            }
          },
          onclose: () => {
            console.log('Voice session closed');
            cleanup();
          },
          onerror: (err) => {
            console.error('Voice session error:', err);
            setStatus('error');
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
          },
          systemInstruction: `És a Elsa Cruz, uma organizadora de eventos de luxo e casamentos no Algarve, Portugal.
          O teu tom é elegante, sofisticado, caloroso e acolhedor (Português de Portugal).
          Responde de forma concisa mas encantadora.
          O teu objetivo é ajudar potenciais clientes a tirar dúvidas sobre os serviços, agendar reuniões ou discutir ideias de eventos.
          Se te perguntarem sobre preços, diz que cada evento é único e sugere agendar uma reunião para um orçamento personalizado.
          Sê breve nas respostas de voz.`
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (err) {
      console.error("Connection failed", err);
      setStatus('error');
    }
  };

  const toggleVoice = () => {
    if (isOpen) {
      setIsOpen(false);
      cleanup();
    } else {
      setIsOpen(true);
      connect();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={toggleVoice}
        className={`fixed bottom-6 right-6 z-[100] p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 ${
          isOpen ? 'bg-stone-900 text-gold-500 scale-110' : 'bg-gold-600 text-white hover:bg-gold-700'
        }`}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>

      {/* Voice Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[100] w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gold-200 overflow-hidden animate-fade-in p-6">
          <div className="text-center">
            <div className="mb-4 relative h-16 flex items-center justify-center">
              {status === 'connecting' && (
                <Loader2 className="w-8 h-8 text-gold-600 animate-spin" />
              )}
              {status === 'connected' && (
                <div className={`transition-all duration-500 ${isTalking ? 'scale-125' : 'scale-100'}`}>
                  <div className="relative">
                    <div className={`absolute inset-0 bg-gold-400 rounded-full opacity-20 animate-ping ${isTalking ? 'block' : 'hidden'}`}></div>
                    <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center shadow-lg">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
              )}
              {status === 'error' && (
                <MicOff className="w-8 h-8 text-red-400" />
              )}
            </div>

            <h3 className="font-display text-xl text-stone-900 mb-1">Elsa Cruz AI</h3>
            <p className="font-sans text-xs uppercase tracking-widest text-stone-500 mb-6">
              {status === 'connecting' && "A conectar..."}
              {status === 'connected' && (isTalking ? "A falar..." : "À escuta...")}
              {status === 'error' && "Indisponível"}
            </p>

            {status === 'connected' && (
              <div className="flex justify-center space-x-1 h-8 items-center">
                {/* Simple Visualizer */}
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 bg-gold-400 rounded-full transition-all duration-150 ${
                      isTalking ? 'animate-pulse h-6' : 'h-2'
                    }`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  ></div>
                ))}
              </div>
            )}
            
            <p className="text-xs text-stone-400 mt-6 italic">
              Experimente perguntar: "Como organizas casamentos?"
            </p>
          </div>
        </div>
      )}
    </>
  );
};


// --- COMPONENTE PRINCIPAL ---

// Mock Data for Gallery
const GALLERY_CATEGORIES = [
  { id: 'all', label: 'Todos' },
  { id: 'tables', label: 'Decoração' },
  { id: 'cakes', label: 'Bolos & Doces' },
  { id: 'invites', label: 'Detalhes' },
  { id: 'favors', label: 'Ambiente' }
];

// IDs das imagens do Google Drive
const DRIVE_IMAGES = [
  "1NJmx2EZ-lmsABlxyAuDqzd6EFc8zVBfj", "1nPS93n0fPUaw4kPUDzrwk7khDRdKA3JD",
  "1sOQOYi9ylL0kGnM9dS-q-0vbZS8qGJ2y", "1PUX0EYkDQduMYB2K0wcr7xOLt8Kw5KqH", "1NGepSjQvoQN3rUAf2imtkCDVGSbOnk0X",
  "14_bqzSwNrY169ib-tHcMgyBwT0amZRjb", "198onOBDIZAxu9zvl8AU0uLJZCHTp4iIl", "18mpeFNB3XoUcLeTRNw1ANlJTICh-McSh",
  "1pXDzsuD0_VD8f1ZV6fvZ0dY7kwxHEwYi", "1uPwrp9AyRuVLH0zZNEillm36IM5BZeZz", "1TabnE1JtFXPUcWCcl5YKpZWYQK0O96eS",
  "1xeKniqosUC3wlnZVBeQeH1f2t6JGbSAf", "1KtHL6KlmOhStjMUFQt8dkPpWiOfbmrv9", "1N-C9i03_KzTeMYfSJcM5935eJaMyMj1w",
  "1SUlnUsZFSzfBXLAqZMcLDhDwrqDH4LTS", "1bUhnsHKZrai9lxYaHd3jgOFNKuBR79nl", "1d95e_gO_DlOkJc7YNHRbELrfnqKfPbjj",
  "1SE4fj_k0QX2PEzz2i90ck6Kb0sYJEQRr", "1G6KSslfAI1noPfKrLMvYN52iTk4fmFF8", "1TnyRV5JY5utWyw9eOGcxWkw7IEVwgaOB",
  "1vb8Wu82AqmESFrDE1qFkMi6isowjMUO7", "1ds5raILndLFalU-aT9pEqwAxaKWyda0-", "1JiWrtIZzMqbJ3_D7mFNRQKhpwFWm_Qf4",
  "1_77cFs8rmMAcBFJJ_2LO03IQvB8qJIOu", "1GeMXrHeh79jdHET3u1Wujc3JFKQvmgEt", "1Btn5a64rFF19J-blNuoGNgptUeYmpVP-",
  "1wgam7f82i9PTATjIrL-WKB5sl5kRXOHV", "1ovLNV_OVhLxEqWfWB-wjJYM7po0ievuw", "1LI8Vg3GszPtVTdK3YowaxBwEBz1L_lUF"
];

// Imagem de destaque para a secção Sobre (retirada da lista acima para não repetir ou usada especificamente)
const ABOUT_IMG_ID = "1f5lg3znspAtpqJtoNEIj3Atmpn1FE0sG";

const TITLES = [
  "Mesa Exclusiva", "Detalhe Floral", "Ambiente de Sonho", "Celebração Única", 
  "Pormenor de Design", "Elegância Pura", "Amor nos Detalhes", "Decoração Floral",
  "Bolo de Casamento", "Luz e Cor", "Memória Eterna", "Toque Pessoal"
];

const CATEGORIES_CYCLE = ['tables', 'cakes', 'invites', 'favors'];

// Construção da Galeria
const GALLERY_ITEMS = DRIVE_IMAGES.map((id, index) => ({
  id: index + 1,
  category: CATEGORIES_CYCLE[index % CATEGORIES_CYCLE.length],
  img: `https://lh3.googleusercontent.com/d/${id}`,
  title: TITLES[index % TITLES.length]
}));

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

  // --- LÓGICA DA GALERIA ---
  const filteredGallery = activeCategory === 'all' 
    ? GALLERY_ITEMS 
    : GALLERY_ITEMS.filter(item => item.category === activeCategory);

  const navigateGallery = useCallback((direction: 'next' | 'prev') => {
    if (!selectedImage) return;
    
    // Encontrar o index na lista filtrada para que a navegação faça sentido para o utilizador
    const currentIndex = filteredGallery.findIndex(item => item.id === selectedImage.id);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % filteredGallery.length;
    } else {
      newIndex = (currentIndex - 1 + filteredGallery.length) % filteredGallery.length;
    }

    setSelectedImage(filteredGallery[newIndex]);
  }, [selectedImage, filteredGallery]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedImage) return;
      
      if (e.key === 'ArrowRight') navigateGallery('next');
      if (e.key === 'ArrowLeft') navigateGallery('prev');
      if (e.key === 'Escape') setSelectedImage(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, navigateGallery]);

  return (
    <div className="min-h-screen font-serif text-stone-800 bg-stone-50 selection:bg-gold-300 selection:text-gold-900">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-sm border-b border-gold-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-display text-2xl font-bold text-gold-700 tracking-widest hover:text-gold-900 transition-colors cursor-pointer">
            ELSA CRUZ
          </div>
          <div className="hidden md:flex space-x-8 font-sans text-xs uppercase tracking-[0.2em] text-stone-500 font-medium">
            <a href="#sobre" className="hover:text-gold-700 transition-colors py-2 border-b border-transparent hover:border-gold-300">Sobre</a>
            <a href="#portfolio" className="hover:text-gold-700 transition-colors py-2 border-b border-transparent hover:border-gold-300">Portfólio</a>
            <button onClick={scrollToForm} className="text-gold-700 font-bold hover:text-gold-900 transition-colors border border-gold-200 px-4 py-2 hover:bg-gold-50">
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
            className="w-full h-full object-cover opacity-90 animate-ken-burns" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/40 via-stone-900/10 to-stone-50/90"></div>
        </div>

        <div className="relative z-10 text-center px-6 fade-in max-w-5xl pt-20">
          <div className="mb-10 flex justify-center transform hover:scale-105 transition-transform duration-700">
             {/* HERO: LOGO */}
             <img 
               src="https://lh3.googleusercontent.com/d/1ZOtb2m-ROuKpDxDejbLL8gEZK7Op8AEj" 
               alt="Logo Elsa Cruz" 
               className="h-52 md:h-96 w-auto object-contain drop-shadow-2xl"
               referrerPolicy="no-referrer"
             />
          </div>
          <h1 className="font-display text-4xl md:text-6xl text-white font-medium tracking-wider mb-6 drop-shadow-lg leading-tight">
            Momentos que duram<br/><span className="italic font-serif text-gold-200">para sempre</span>
          </h1>
          <p className="font-sans text-sm md:text-base text-white/90 font-light tracking-[0.2em] mb-12 max-w-xl mx-auto uppercase">
            Planeamento exclusivo de eventos no Algarve
          </p>
          <button 
            onClick={scrollToForm}
            className="group relative px-10 py-4 bg-white/95 backdrop-blur-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(197,160,89,0.6)] transition-all duration-300 rounded-sm"
          >
            <span className="relative text-sm font-sans uppercase tracking-widest text-stone-900 font-bold group-hover:text-gold-700 transition-colors">Começar a Planear</span>
          </button>
        </div>

        <div className="absolute bottom-10 w-full flex justify-center animate-bounce">
          <ChevronDown className="text-stone-400 w-6 h-6" />
        </div>
      </header>

      {/* About Section - More Elegant Layout */}
      <section id="sobre" className="py-32 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
           {/* Decorative elements */}
           <div className="absolute top-0 left-0 w-64 h-64 bg-stone-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 -z-10"></div>
           <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 -z-10"></div>

          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="relative z-10">
                 <img 
                  src={`https://lh3.googleusercontent.com/d/${ABOUT_IMG_ID}`}
                  alt="Detalhes de planeamento" 
                  className="w-full h-[600px] object-cover shadow-2xl rounded-lg grayscale hover:grayscale-0 transition-all duration-1000 ease-in-out"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute top-10 -left-10 w-full h-full border border-gold-300 rounded-lg z-0 hidden md:block"></div>
            </div>
            
            <div className="order-1 md:order-2 text-center md:text-left space-y-8">
              <span className="text-gold-600 font-sans text-xs uppercase tracking-[0.3em]">A Minha Paixão</span>
              <h2 className="font-display text-5xl text-stone-900 leading-tight">
                A Arte de <span className="italic text-gold-700">Celebrar</span>
              </h2>
              <div className="w-16 h-0.5 bg-gold-300 mx-auto md:mx-0"></div>
              
              <p className="text-stone-500 font-light leading-relaxed text-lg">
                Olá, sou a <strong className="text-stone-800 font-medium">Elsa Cruz</strong>. Acredito que o verdadeiro luxo reside nos detalhes que ninguém esquece. 
                A minha missão é traduzir a vossa essência numa experiência sensorial única.
              </p>
              <p className="text-stone-500 font-light leading-relaxed text-lg">
                Do Algarve para o mundo, dedico-me a criar ambientes sofisticados, onde a elegância encontra a emoção. 
                Cada evento é uma "tela em branco" que pinto com flores, luz e alma.
              </p>

              <div className="pt-8 grid grid-cols-2 gap-8 border-t border-stone-100">
                <div>
                   <p className="font-display text-3xl text-gold-800">10+</p>
                   <p className="text-xs uppercase tracking-widest text-stone-400 mt-2">Anos de Experiência</p>
                </div>
                <div>
                   <p className="font-display text-3xl text-gold-800">Algarve</p>
                   <p className="text-xs uppercase tracking-widest text-stone-400 mt-2">Região Exclusiva</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portfolio - Glamour Upgrade */}
      <section id="portfolio" className="py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <div className="max-w-xl">
              <span className="font-sans uppercase tracking-[0.3em] text-gold-600 text-xs block mb-4">Galeria</span>
              <h2 className="font-display text-4xl text-stone-900">Histórias Visuais</h2>
            </div>

            {/* Elegant Filter Tabs */}
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              {GALLERY_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`relative pb-2 text-sm uppercase tracking-widest transition-all duration-300 ${
                    activeCategory === category.id
                      ? 'text-stone-900 font-medium'
                      : 'text-stone-400 hover:text-gold-600'
                  }`}
                >
                  {category.label}
                  <span className={`absolute bottom-0 left-0 h-px bg-gold-500 transition-all duration-300 ${
                    activeCategory === category.id ? 'w-full' : 'w-0'
                  }`}></span>
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Grid - More Space & Elegance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGallery.map((item) => (
              <div 
                key={item.id} 
                className="group relative aspect-[4/5] bg-stone-200 overflow-hidden cursor-pointer rounded-lg shadow-md hover:shadow-xl transition-all duration-500"
                onClick={() => setSelectedImage(item)}
              >
                <img 
                  src={item.img} 
                  alt={item.title} 
                  className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                
                {/* Elegant Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-75">
                    <p className="text-gold-200 text-xs uppercase tracking-widest mb-2">
                      {GALLERY_CATEGORIES.find(c => c.id === item.category)?.label}
                    </p>
                    <h3 className="font-display text-white text-xl tracking-wide">{item.title}</h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal - Cinematic & Navigable */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] bg-stone-900/95 backdrop-blur-md flex items-center justify-center p-4 transition-opacity duration-300" 
          onClick={() => setSelectedImage(null)}
        >
          {/* Close Button */}
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors p-2 z-50">
            <X className="w-8 h-8 font-light" />
          </button>

          {/* Navigation Buttons */}
          <button 
            className="absolute left-4 md:left-8 text-white/50 hover:text-gold-400 hover:scale-110 transition-all p-4 z-50 hidden md:block"
            onClick={(e) => { e.stopPropagation(); navigateGallery('prev'); }}
          >
            <ChevronLeft className="w-12 h-12" strokeWidth={1} />
          </button>

          <button 
            className="absolute right-4 md:right-8 text-white/50 hover:text-gold-400 hover:scale-110 transition-all p-4 z-50 hidden md:block"
            onClick={(e) => { e.stopPropagation(); navigateGallery('next'); }}
          >
            <ChevronRight className="w-12 h-12" strokeWidth={1} />
          </button>

          {/* Image Container */}
          <div 
            className="max-w-6xl w-full h-full flex flex-col items-center justify-center relative px-8 md:px-20" 
            onClick={e => e.stopPropagation()}
          >
            <img 
              key={selectedImage.id} // Forces animation when image changes
              src={selectedImage.img} 
              alt={selectedImage.title} 
              className="max-h-[80vh] w-auto object-contain shadow-2xl animate-fade-in rounded-sm"
              referrerPolicy="no-referrer"
            />
            
            <div className="mt-8 text-center animate-fade-in">
              <h3 className="font-display text-3xl text-white tracking-widest font-light">{selectedImage.title}</h3>
              <p className="text-gold-400/80 font-sans uppercase tracking-[0.2em] text-xs mt-3">
                {GALLERY_CATEGORIES.find(c => c.id === selectedImage.category)?.label}
              </p>
            </div>
          </div>
          
           {/* Mobile Navigation (Bottom) */}
           <div className="absolute bottom-10 flex gap-12 md:hidden z-50" onClick={e => e.stopPropagation()}>
             <button onClick={() => navigateGallery('prev')} className="text-white p-2 border border-white/20 rounded-full">
                <ChevronLeft className="w-6 h-6" />
             </button>
             <button onClick={() => navigateGallery('next')} className="text-white p-2 border border-white/20 rounded-full">
                <ChevronRight className="w-6 h-6" />
             </button>
           </div>
        </div>
      )}

      {/* Inquiry Form */}
      <section ref={formRef} className="py-32 px-6 bg-stone-100" id="contact">
        <div className="max-w-5xl mx-auto bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Side Decor */}
          <div className="hidden md:block w-1/3 bg-stone-900 relative">
             <div className="absolute inset-0 opacity-40">
                <img 
                  src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=2069&auto=format&fit=crop" 
                  className="w-full h-full object-cover grayscale"
                  alt="Decor"
                />
             </div>
             <div className="relative z-10 p-12 h-full flex flex-col justify-between text-white/80">
                <div>
                  <h3 className="font-display text-2xl text-gold-400 mb-4">Vamos Conversar?</h3>
                  <p className="font-sans font-light text-sm leading-relaxed">
                    Cada grande evento começa com uma simples conversa. Partilhe a sua visão.
                  </p>
                </div>
                <div className="space-y-4 text-sm font-light">
                   <p>+351 966 324 250</p>
                   <p>geral@elsacruz.pt</p>
                </div>
             </div>
          </div>

          <div className="flex-1 p-8 md:p-16">
            <div className="mb-10">
              <span className="text-xs uppercase tracking-widest text-gold-600">Contacto</span>
              <h2 className="font-display text-3xl text-stone-900 mt-2">Solicitar Orçamento</h2>
            </div>

            {aiResponse ? (
              <div className="bg-gold-50 p-8 border border-gold-200 text-center animate-fade-in h-full flex flex-col justify-center">
                <Sparkles className="w-12 h-12 text-gold-500 mx-auto mb-4" />
                <h3 className="font-display text-2xl text-gold-900 mb-4">Mensagem Recebida</h3>
                <p className="text-stone-700 whitespace-pre-line leading-relaxed mb-6 font-light">
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
                  className="text-xs font-bold text-gold-700 hover:text-gold-900 uppercase tracking-widest border-b border-gold-300 pb-1 w-max mx-auto"
                >
                  Enviar novo pedido
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="group">
                    <input 
                      required
                      name="name"
                      value={formState.name}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent placeholder-transparent text-sm"
                      id="name"
                      placeholder="Nome"
                    />
                    <label htmlFor="name" className="block text-xs uppercase tracking-widest text-stone-400 -mt-8 group-focus-within:-mt-10 group-focus-within:text-gold-500 transition-all pointer-events-none mb-4">Nome Completo</label>
                  </div>
                  <div className="group">
                    <input 
                      required
                      type="email"
                      name="email"
                      value={formState.email}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent placeholder-transparent text-sm"
                      id="email"
                      placeholder="Email"
                    />
                     <label htmlFor="email" className="block text-xs uppercase tracking-widest text-stone-400 -mt-8 group-focus-within:-mt-10 group-focus-within:text-gold-500 transition-all pointer-events-none mb-4">Email</label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="group">
                    <input 
                      required
                      name="phone"
                      value={formState.phone}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent placeholder-transparent text-sm"
                      id="phone"
                      placeholder="Tel"
                    />
                    <label htmlFor="phone" className="block text-xs uppercase tracking-widest text-stone-400 -mt-8 group-focus-within:-mt-10 group-focus-within:text-gold-500 transition-all pointer-events-none mb-4">Telemóvel</label>
                  </div>
                  <div>
                    <select 
                      name="eventType"
                      value={formState.eventType}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent text-sm text-stone-600"
                    >
                      {Object.values(EventType).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="group">
                    <input 
                      type="date"
                      name="date"
                      value={formState.date}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent text-stone-500 text-sm"
                    />
                  </div>
                  <div className="group">
                    <input 
                      type="number"
                      name="guestCount"
                      value={formState.guestCount}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent placeholder-transparent text-sm"
                      id="guests"
                      placeholder="0"
                    />
                    <label htmlFor="guests" className="block text-xs uppercase tracking-widest text-stone-400 -mt-8 group-focus-within:-mt-10 group-focus-within:text-gold-500 transition-all pointer-events-none mb-4">Nº Convidados</label>
                  </div>
                  <div className="group">
                    <input 
                      name="budget"
                      value={formState.budget}
                      onChange={handleInputChange}
                      className="w-full border-b border-stone-200 py-2 focus:border-gold-500 outline-none transition-colors bg-transparent placeholder-transparent text-sm"
                      id="budget"
                      placeholder="0"
                    />
                    <label htmlFor="budget" className="block text-xs uppercase tracking-widest text-stone-400 -mt-8 group-focus-within:-mt-10 group-focus-within:text-gold-500 transition-all pointer-events-none mb-4">Orçamento</label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 mb-4">Serviços Necessários</label>
                  <div className="grid md:grid-cols-2 gap-3">
                    {SERVICE_OPTIONS.map(service => (
                      <div 
                        key={service}
                        onClick={() => handleServiceToggle(service)}
                        className={`cursor-pointer px-4 py-3 border transition-all duration-300 flex items-center space-x-3 text-sm ${
                          formState.servicesNeeded.includes(service) 
                            ? 'border-gold-500 bg-gold-50 text-gold-900' 
                            : 'border-stone-100 hover:border-gold-200 text-stone-500'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          formState.servicesNeeded.includes(service) ? 'border-gold-500 bg-gold-500 text-white' : 'border-stone-300'
                        }`}>
                          {formState.servicesNeeded.includes(service) && <Check className="w-2 h-2" />}
                        </div>
                        <span className="font-sans font-light">{service}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-stone-400 mb-2">Visão & Detalhes</label>
                  <textarea 
                    required
                    name="details"
                    value={formState.details}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full border border-stone-200 p-3 focus:border-gold-500 outline-none transition-colors bg-transparent resize-none text-sm font-light"
                    placeholder="Conte-me mais sobre o seu sonho..."
                  />
                </div>

                <div className="text-right pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-stone-900 text-white px-10 py-4 text-xs uppercase tracking-[0.2em] hover:bg-gold-600 transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
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
        </div>
      </section>

      {/* Footer - Minimalist */}
      <footer className="bg-stone-900 text-white/60 py-20 border-t border-white/5 font-light">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 text-sm">
          <div className="md:col-span-2">
            <div className="font-display text-3xl text-white mb-6 tracking-wider">
               ELSA CRUZ
            </div>
            <p className="max-w-xs leading-relaxed mb-8">
              Criando memórias inesquecíveis no Algarve através de um design excecional e planeamento irrepreensível.
            </p>
            <div className="flex space-x-6">
              <a href="https://www.instagram.com/jardim.das.festas/" className="hover:text-gold-400 transition-colors">Instagram</a>
              <a href="#" className="hover:text-gold-400 transition-colors">Facebook</a>
            </div>
          </div>
          
          <div>
            <h4 className="text-white uppercase tracking-widest text-xs mb-6">Contactos</h4>
            <div className="space-y-4">
              <a href="mailto:geral@elsacruz.pt" className="block hover:text-white transition-colors">geral@elsacruz.pt</a>
              <a href="tel:+351966324250" className="block hover:text-white transition-colors">+351 966 324 250</a>
            </div>
          </div>

          <div>
             <h4 className="text-white uppercase tracking-widest text-xs mb-6">Legal</h4>
             <div className="space-y-4">
                <a href="#" className="block hover:text-white transition-colors">Política de Privacidade</a>
                <a href="#" className="block hover:text-white transition-colors">Termos e Condições</a>
             </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs tracking-widest uppercase">
          <div>&copy; {new Date().getFullYear()} Elsa Cruz Eventos</div>
          <div className="mt-4 md:mt-0">Design by AI Studio</div>
        </div>
      </footer>
      
      {/* Voice Assistant Widget */}
      <VoiceWidget />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);