import { useState, type FormEvent } from 'react';
import { Wine, LogIn, KeyRound } from 'lucide-react';
import { api } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const token = response.data.access_token;
      localStorage.setItem('bipfy_token', token);
      if (response.data.usuario) {
        localStorage.setItem('bipfy_user', JSON.stringify(response.data.usuario));
      }
      
      // Redireciona para o Painel logado
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao conectar no servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[150px] pointer-events-none"></div>

      <Link to="/" className="absolute top-8 left-8 text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        <Wine className="w-5 h-5 text-blue-500" /> e-Sigma Ágape
      </Link>

      <div className="w-full max-w-md relative z-10">
        
        <div className="bg-white/[0.03] border border-white/[0.08] backdrop-blur-2xl p-10 rounded-3xl shadow-2xl shadow-black/50">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-5 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Bem-vindo(a) de volta</h2>
            <p className="text-gray-400 mt-2 text-center text-sm">
              Insira suas credenciais para acessar o painel administrativo.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-2 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">E-mail corporativo</label>
              <input 
                type="email" 
                required
                className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="admin@e-sigma.app"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha de acesso</label>
              <input 
                type="password" 
                required
                className="w-full px-5 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" /> Entrar no Painel
                </>
              )}
            </button>
          </form>
        </div>
        
        <p className="text-center text-gray-500 text-sm mt-8">
          agape.e-sigma.app • Módulo Integrado ao Ecossistema e-Sigma
        </p>

      </div>
    </div>
  );
}
