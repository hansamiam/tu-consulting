import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home, Calendar, Mail, MessageCircle, ShieldCheck, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";

interface VerifyResult {
  paid: boolean;
  status: string;
  amount_usd: number;
  currency: string;
  customer_email?: string;
  product_name?: string | null;
  is_consultation: boolean;
}

export default function ThankYouRu() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const legacyType = searchParams.get("type") || "consultation";

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(!!sessionId);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Оплата подтверждена — Top Uni Consulting";
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch { /* ignore */ } };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: { session_id: sessionId },
        });
        if (cancelled) return;
        if (error) throw error;
        setResult(data as VerifyResult);
      } catch (e) {
        if (cancelled) return;
        setVerifyError(e instanceof Error ? e.message : "Verification failed");
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  const isConsultation = result?.is_consultation ?? legacyType === "consultation";
  const productLabel = result?.product_name || legacyType;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary to-primary-dark">
      <Navigation language="ru" />
      <div className="container mx-auto px-4 py-10 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            {verifying ? (
              <>
                <Loader2 className="w-14 h-14 text-gold mx-auto mb-4 animate-spin" />
                <h1 className="text-2xl md:text-3xl font-bold text-gold mb-2">Подтверждаем оплату…</h1>
                <p className="text-primary-foreground/80">Несколько секунд.</p>
              </>
            ) : verifyError ? (
              <>
                <AlertTriangle className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-2xl md:text-4xl font-bold text-gold mb-3">Не удалось автоматически подтвердить оплату</h1>
                <p className="text-primary-foreground/90 max-w-2xl mx-auto">
                  Если карта была списана — бронирование в безопасности. Напишите{" "}
                  <a href="mailto:team@topuniconsulting.com" className="underline">team@topuniconsulting.com</a>{" "}
                  с чеком, и мы подтвердим в течение нескольких часов.
                </p>
              </>
            ) : result?.paid ? (
              <>
                <CheckCircle className="w-16 h-16 md:w-20 md:h-20 text-gold mx-auto mb-4" />
                <h1 className="text-3xl md:text-5xl font-bold text-gold mb-3">Вы с нами. Добро пожаловать.</h1>
                <p className="text-base md:text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                  Списано <strong>${result.amount_usd.toLocaleString()}</strong> за{" "}
                  <strong>{productLabel}</strong>. Чек отправлен на{" "}
                  <strong>{result.customer_email}</strong>.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
                <h1 className="text-2xl md:text-3xl font-bold text-gold mb-3">Оплата обрабатывается</h1>
                <p className="text-primary-foreground/90 max-w-2xl mx-auto">
                  Stripe ещё подтверждает платёж. Обновите страницу через минуту или напишите на{" "}
                  <a href="mailto:team@topuniconsulting.com" className="underline">team@topuniconsulting.com</a>.
                </p>
              </>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-3 md:p-4 mb-6">
            <div className="flex items-center gap-2 px-3 pt-2 pb-3">
              <span className="bg-accent text-accent-foreground rounded-full h-7 w-7 inline-flex items-center justify-center text-sm font-bold">1</span>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                {isConsultation ? "Запланируйте консультацию" : "Запланируйте первую сессию"}
              </h2>
            </div>
            <div
              className="calendly-inline-widget"
              data-url="https://calendly.com/topuniconsulting"
              style={{ minWidth: "320px", height: "660px" }}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5">
              <Mail className="h-5 w-5 text-gold mb-2" />
              <h3 className="font-semibold text-gold mb-1">Проверьте почту</h3>
              <p className="text-sm text-primary-foreground/80">Чек Stripe и подтверждение Calendly придут в течение нескольких минут.</p>
            </div>
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5">
              <ShieldCheck className="h-5 w-5 text-gold mb-2" />
              <h3 className="font-semibold text-gold mb-1">Гарантия 7 дней</h3>
              <p className="text-sm text-primary-foreground/80">Не понравилось? Полный возврат в течение 7 дней.</p>
            </div>
            <div className="bg-gold/10 border border-gold/20 rounded-xl p-5">
              <MessageCircle className="h-5 w-5 text-gold mb-2" />
              <h3 className="font-semibold text-gold mb-1">Нужна помощь?</h3>
              <p className="text-sm text-primary-foreground/80">
                <a href="https://wa.me/996556447020" target="_blank" rel="noreferrer" className="underline">Напишите в WhatsApp</a>.
              </p>
            </div>
          </div>

          {result?.paid && isConsultation && (
            <div className="bg-gradient-to-r from-gold/20 to-accent/20 border border-gold/40 rounded-2xl p-6 mb-8">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-[260px]">
                  <p className="text-xs uppercase tracking-wider font-semibold text-gold mb-1">Решите сегодня — сэкономьте</p>
                  <h3 className="text-xl font-bold text-gold mb-2">Зачтём оплату консультации в счёт пакета</h3>
                  <p className="text-sm text-primary-foreground/90">
                    Если решите перейти на пакет в течение звонка — мы зачтём ${result.amount_usd}, которые вы только что оплатили, в стоимость пакета Starter, Standard или Premium.
                  </p>
                </div>
                <Link to="/offerings/ru#packages">
                  <Button variant="gold" size="lg">
                    Пакеты <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="text-center">
            <Button onClick={() => navigate("/ru")} variant="outline" className="border-gold text-gold hover:bg-gold hover:text-primary">
              <Home className="w-4 h-4 mr-2" /> На главную
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
