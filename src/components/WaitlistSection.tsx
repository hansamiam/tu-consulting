import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WaitlistSectionProps {
  language: "en" | "ru";
}

export const WaitlistSection = ({ language }: WaitlistSectionProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const text = {
    en: {
      title: "Not in Kyrgyzstan?",
      description: "Join our waitlist to hear when we expand to your region",
      placeholder: "Enter your email",
      button: "Join Waitlist",
      success: "You're on the list!",
      successDesc: "We'll notify you when we expand to your region.",
      error: "Something went wrong",
      errorDesc: "Please try again later.",
      invalidEmail: "Please enter a valid email address",
    },
    ru: {
      title: "Не в Кыргызстане?",
      description: "Присоединяйтесь к нашему списку ожидания, чтобы узнать, когда мы откроемся в вашем регионе",
      placeholder: "Введите ваш email",
      button: "Присоединиться",
      success: "Вы в списке!",
      successDesc: "Мы сообщим вам, когда откроемся в вашем регионе.",
      error: "Что-то пошло не так",
      errorDesc: "Пожалуйста, попробуйте позже.",
      invalidEmail: "Пожалуйста, введите действительный email адрес",
    },
  };

  const t = text[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast({
        title: t.invalidEmail,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("waitlist_emails")
        .insert([{ email: email.toLowerCase().trim() }]);

      if (error) throw error;

      toast({
        title: t.success,
        description: t.successDesc,
      });
      setEmail("");
    } catch (error: any) {
      // Check if it's a duplicate email error
      if (error.code === "23505") {
        toast({
          title: t.success,
          description: t.successDesc,
        });
        setEmail("");
      } else {
        toast({
          title: t.error,
          description: t.errorDesc,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 bg-primary/5 border-primary/20 backdrop-blur-sm">
      <div className="max-w-xl mx-auto text-center space-y-3">
        <h3 className="text-lg sm:text-xl font-semibold text-primary-foreground">
          {t.title}
        </h3>
        <p className="text-xs sm:text-sm text-primary-foreground/60">
          {t.description}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mt-3 max-w-md mx-auto">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 bg-background/50 text-sm"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            variant="gold"
            disabled={isSubmitting}
            className="whitespace-nowrap"
            size="sm"
          >
            {t.button}
          </Button>
        </form>
      </div>
    </Card>
  );
};
