import { useState } from 'react';
import { 
  Printer, 
  Copy, 
  Check, 
  X, 
  Calendar, 
  Receipt, 
  FileText, 
  ShieldCheck 
} from 'lucide-react';
import { api } from '../services/api';

export interface DadosComprovante {
  comanda_id: number;
  data_hora: string;
  estabelecimento_nome: string;
  loja_numero?: string;
  operador_nome?: string;
  cliente_nome?: string;
  cliente_documento?: string;
  tipo_consumidor?: string;
  itens: Array<{
    produto_nome: string;
    quantidade: number;
    valor_unitario: number;
    subtotal: number;
  }>;
  total: number;
  forma_pagamento: string;
  saldo_anterior?: number | null;
  saldo_atual?: number | null;
  limite_fiado?: number;
  texto_escpos: string;
}

interface ComprovanteTermicoModalProps {
  comprovante: DadosComprovante | null;
  isOpen: boolean;
  onClose: () => void;
  clienteId?: number | null;
}

export function ComprovanteTermicoModal({
  comprovante,
  isOpen,
  onClose,
  clienteId
}: ComprovanteTermicoModalProps) {
  const [copiado, setCopiado] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'comprovante' | 'extrato'>('comprovante');

  // Filtros de Extrato por Período
  const hojeStr = new Date().toISOString().split('T')[0];
  const [dataInicio, setDataInicio] = useState(hojeStr);
  const [dataFim, setDataFim] = useState(hojeStr);
  const [carregandoExtrato, setCarregandoExtrato] = useState(false);
  const [extratoPeriodo, setExtratoPeriodo] = useState<any>(null);

  if (!isOpen || !comprovante) return null;

  const handleImprimir = () => {
    window.print();
  };

  const handleCopiarTexto = () => {
    const textoParaCopiar = abaAtiva === 'comprovante' 
      ? comprovante.texto_escpos 
      : (extratoPeriodo?.texto_escpos || comprovante.texto_escpos);
    
    navigator.clipboard.writeText(textoParaCopiar);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const carregarExtratoPeriodo = async () => {
    if (!clienteId && !comprovante.cliente_documento) {
      alert("Nenhum cliente identificado para emitir extrato consolidado por período.");
      return;
    }
    try {
      setCarregandoExtrato(true);
      const res = await api.get('/comandas/relatorios/extrato-periodo', {
        params: {
          cliente_id: clienteId || 1,
          data_inicio: `${dataInicio}T00:00:00`,
          data_fim: `${dataFim}T23:59:59`
        }
      });
      setExtratoPeriodo(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao carregar extrato de período.");
    } finally {
      setCarregandoExtrato(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4 animate-fadeIn">
      
      {/* ============================================================== */}
      {/* ÁREA EXCLUSIVA DE IMPRESSÃO (ESCONDIDA NA TELA, VISÍVEL NO PRINT) */}
      {/* ============================================================== */}
      <div className="comprovante-termico-print hidden print:block">
        <pre className="font-mono text-xs whitespace-pre-wrap leading-tight text-black">
          {abaAtiva === 'comprovante' ? comprovante.texto_escpos : (extratoPeriodo?.texto_escpos || comprovante.texto_escpos)}
        </pre>
      </div>

      {/* Card Principal do Modal */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Cabeçalho do Modal com Navegação entre Comprovante e Extrato */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-amber-300">
                  Comprovante Térmico & Fatura
                </h3>
                <p className="text-xs text-slate-400">
                  Bobina 58mm/80mm • Conta do Bar Isolada da Loja
                </p>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Abas Superiores de Alternância */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setAbaAtiva('comprovante')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                abaAtiva === 'comprovante'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Cupom da Comanda #{comprovante.comanda_id}
            </button>
            <button
              type="button"
              onClick={() => {
                setAbaAtiva('extrato');
                if (!extratoPeriodo) carregarExtratoPeriodo();
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[38px] ${
                abaAtiva === 'extrato'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Extrato por Período
            </button>
          </div>
        </div>

        {/* Corpo com o Layout da Bobina Térmica */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {abaAtiva === 'extrato' && (
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Filtrar Fatura do Obreiro por Período:</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Data Início</label>
                  <input 
                    type="date" 
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs min-h-[38px]"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Data Fim</label>
                  <input 
                    type="date" 
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs min-h-[38px]"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={carregarExtratoPeriodo}
                disabled={carregandoExtrato}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold transition-colors min-h-[38px] flex items-center justify-center gap-1.5"
              >
                {carregandoExtrato ? "Gerando Extrato..." : "Atualizar Extrato do Período"}
              </button>
            </div>
          )}

          {/* Visual Realista da Bobina de Papel Térmico (Estilo Cupom Fiscal / Recibo) */}
          <div className="bg-white text-slate-900 p-5 rounded-lg shadow-inner font-mono text-xs border border-slate-300 relative mx-auto max-w-sm select-none">
            
            {/* Efeito serrilhado no topo do papel */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-repeat-x bg-[radial-gradient(circle,transparent_4px,#ffffff_4px)] -mt-1"></div>

            {abaAtiva === 'comprovante' ? (
              <div className="space-y-2">
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <h4 className="font-bold text-sm tracking-wide uppercase">{comprovante.estabelecimento_nome}</h4>
                  {comprovante.loja_numero && (
                    <p className="text-[11px] text-slate-600 font-bold">Oficina / Loja Nº {comprovante.loja_numero}</p>
                  )}
                  <p className="text-[10px] text-slate-500">SISTEMA DE CONSUMO ÁGAPE (BAR)</p>
                  <p className="text-[10px] text-slate-500 mt-1">Conta Financeira Segregada da Loja</p>
                </div>

                <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-400 py-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Comprovante:</span>
                    <span className="font-bold">#{comprovante.comanda_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data/Hora:</span>
                    <span>{new Date(comprovante.data_hora).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operador:</span>
                    <span className="truncate max-w-[170px]">{comprovante.operador_nome || 'Balcão'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cliente:</span>
                    <span className="font-bold truncate max-w-[170px]">{comprovante.cliente_nome || 'Avulso'}</span>
                  </div>
                  {comprovante.cliente_documento && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">CIM / CPF:</span>
                      <span>{comprovante.cliente_documento}</span>
                    </div>
                  )}
                </div>

                {/* Tabela de Itens Consumidos */}
                <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-600 border-b border-slate-300 pb-1">
                    <span>QTD ITEM</span>
                    <span>TOTAL</span>
                  </div>
                  {comprovante.itens.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] items-center">
                      <span className="truncate max-w-[210px]">
                        {it.quantidade}x {it.produto_nome}
                      </span>
                      <span className="font-bold">R$ {it.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totais e Forma de Pagamento */}
                <div className="py-2 space-y-1 border-b border-dashed border-slate-400">
                  <div className="flex justify-between text-sm font-extrabold text-slate-900">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-base">R$ {comprovante.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>Forma de Pagamento:</span>
                    <span className="font-bold uppercase">{comprovante.forma_pagamento}</span>
                  </div>
                </div>

                {/* Saldo na Conta do Bar */}
                {comprovante.saldo_atual !== null && comprovante.saldo_atual !== undefined && (
                  <div className="p-2 bg-slate-100 rounded text-[10px] space-y-0.5 border border-slate-200">
                    <div className="font-bold text-slate-700 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Conta do Bar (Exclusiva)
                    </div>
                    {comprovante.saldo_anterior !== null && comprovante.saldo_anterior !== undefined && (
                      <div className="flex justify-between text-slate-500">
                        <span>Saldo Anterior:</span>
                        <span>R$ {comprovante.saldo_anterior.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>Saldo Atual:</span>
                      <span className={comprovante.saldo_atual < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        R$ {comprovante.saldo_atual.toFixed(2)}
                      </span>
                    </div>
                    {comprovante.saldo_atual < 0 && (
                      <p className="text-[9px] text-slate-500 italic mt-0.5">
                        * Limite de saldo devedor autorizado: R$ 100,00
                      </p>
                    )}
                  </div>
                )}

                <div className="text-center pt-2 text-[10px] text-slate-500 italic">
                  Obrigado pela Fraternidade!
                </div>
              </div>
            ) : (
              /* Visualização do Extrato por Período */
              <div className="space-y-2">
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <h4 className="font-bold text-sm tracking-wide uppercase">EXTRATO DE CONSUMAÇÃO</h4>
                  <p className="text-[10px] text-slate-500">SISTEMA ÁGAPE • CONTA DO BAR</p>
                  <p className="text-[10px] text-slate-600 mt-1">
                    Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} a {new Date(dataFim).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="text-[11px] py-1 border-b border-dashed border-slate-400">
                  <div>Cliente: <strong>{extratoPeriodo?.cliente_nome || comprovante.cliente_nome}</strong></div>
                  <div>CIM/CPF: {extratoPeriodo?.cliente_documento || comprovante.cliente_documento || '-'}</div>
                </div>

                {extratoPeriodo?.comandas?.length > 0 ? (
                  <div className="py-2 border-b border-dashed border-slate-400 space-y-2 text-[10px]">
                    {extratoPeriodo.comandas.map((c: any) => (
                      <div key={c.id} className="border-b border-slate-100 pb-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>Comanda #{c.id} ({new Date(c.data).toLocaleDateString('pt-BR')})</span>
                          <span>R$ {c.total.toFixed(2)}</span>
                        </div>
                        <div className="text-slate-500 pl-1">
                          {c.itens.map((it: any, i: number) => (
                            <div key={i} className="flex justify-between">
                              <span>{it.quantidade}x {it.produto}</span>
                              <span>R$ {it.subtotal.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-[11px]">
                    Nenhum consumo registrado neste intervalo de datas.
                  </div>
                )}

                <div className="pt-2 text-[11px] space-y-1">
                  <div className="flex justify-between font-extrabold text-sm text-slate-900">
                    <span>TOTAL NO PERÍODO:</span>
                    <span>R$ {(extratoPeriodo?.total_periodo || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>SALDO ATUAL NO BAR:</span>
                    <span className={(extratoPeriodo?.saldo_atual_bar || 0) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                      R$ {(extratoPeriodo?.saldo_atual_bar || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Botões de Ação Ergonômicos (Altura Mínima 44px - WCAG) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={handleImprimir}
            className="w-full sm:flex-1 min-h-[48px] px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-98 transition-all"
          >
            <Printer className="w-5 h-5 text-slate-950" />
            <span>Imprimir Térmica (58/80mm)</span>
          </button>

          <button
            type="button"
            onClick={handleCopiarTexto}
            className="w-full sm:w-auto min-h-[48px] px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-98 transition-all"
            title="Copiar texto puro ESC/POS para app térmico Bluetooth"
          >
            {copiado ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span>Copiar ESC/POS</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[48px] px-5 py-3 text-slate-400 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
