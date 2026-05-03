import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";
import { CreditCard, Shield, Lock, AlertTriangle } from "lucide-react";

const PaymentInfoRu = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="ru" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Оплата банковской картой
            </h1>
            <p className="text-muted-foreground mb-8">
              Последнее обновление: {new Date().toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
            </p>
          </ScrollReveal>

          {/* Payment Methods Section */}
          <ScrollReveal>
            <section className="mb-10">
              <h2 className="text-2xl font-semibold mb-6">Принимаемые способы оплаты</h2>
              <div className="bg-muted/30 rounded-lg p-6 border border-border">
                <div className="flex flex-wrap items-center justify-center gap-8 mb-6">
                  {/* Visa Logo */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <svg viewBox="0 0 48 48" className="h-12 w-20">
                        <path fill="#1565C0" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/>
                        <path fill="#FFF" d="M15.186 19l-2.626 7.832c0 0-.667-3.313-.733-3.729-1.495-3.411-3.701-3.221-3.701-3.221L10.726 30v-.002h3.161L18.258 19H15.186zM17.689 30L20.56 30 22.296 19 19.389 19zM38.008 19h-3.021l-4.71 11h2.852l.588-1.571h3.596L37.619 30h2.613L38.008 19zM34.513 26.328l1.563-4.157.818 4.157H34.513zM26.369 22.206c0-.606.498-1.057 1.926-1.057.928 0 1.991.674 1.991.674l.466-2.309c0 0-1.358-.515-2.691-.515-3.019 0-4.576 1.444-4.576 3.272 0 3.306 3.979 2.853 3.979 4.551 0 .291-.231.964-1.888.964-1.662 0-2.759-.609-2.759-.609l-.495 2.216c0 0 1.063.606 3.117.606 2.059 0 4.915-1.54 4.915-3.752C30.354 23.586 26.369 23.394 26.369 22.206z"/>
                        <path fill="#FFC107" d="M12.212,24.945l-0.966-4.748c0,0-0.437-1.029-1.573-1.029c-1.136,0-4.44,0-4.44,0S10.894,20.84,12.212,24.945z"/>
                      </svg>
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">Visa</span>
                  </div>
                  
                  {/* Mastercard Logo */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <svg viewBox="0 0 48 48" className="h-12 w-20">
                        <path fill="#3F51B5" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/>
                        <circle fill="#FFC107" cx="30" cy="24" r="10"/>
                        <circle fill="#FF3D00" cx="18" cy="24" r="10"/>
                        <path fill="#FF9800" d="M24,17.5c-2.018,2.214-3.25,5.149-3.25,8.375s1.232,6.161,3.25,8.375c2.018-2.214,3.25-5.149,3.25-8.375S26.018,19.714,24,17.5z"/>
                      </svg>
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">Mastercard</span>
                  </div>
                  
                  {/* Elkart Logo */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-center h-[56px] w-[80px]">
                      <span className="text-lg font-bold text-green-600">ЭЛКАРТ</span>
                    </div>
                    <span className="text-sm text-muted-foreground mt-2">Элкарт</span>
                  </div>
                </div>
                <p className="text-center text-muted-foreground">
                  Мы принимаем платежи через FreedomPay, поддерживая карты Visa, Mastercard и Элкарт, выпущенные банками Кыргызской Республики и зарубежных стран.
                </p>
              </div>
            </section>
          </ScrollReveal>

          <div className="prose prose-lg max-w-none text-foreground">
            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  1. Процесс оплаты
                </h2>
                <p className="text-muted-foreground mb-4">
                  Для оплаты наших услуг банковской картой выполните следующие шаги:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-3">
                  <li><strong>Выберите услугу:</strong> Выберите тип консультации или пакет услуг на странице «Услуги».</li>
                  <li><strong>Заполните форму бронирования:</strong> Укажите свою контактную информацию и необходимые данные.</li>
                  <li><strong>Перейдите к оплате:</strong> Вы будете перенаправлены на защищенную страницу оплаты FreedomPay.</li>
                  <li><strong>Введите данные карты:</strong> Введите номер карты, срок действия и CVV-код на защищенной странице оплаты.</li>
                  <li><strong>Подтвердите платеж:</strong> Пройдите верификацию 3D Secure, если это требуется вашим банком.</li>
                  <li><strong>Получите подтверждение:</strong> После успешной оплаты вы получите подтверждение по электронной почте и сможете назначить консультацию.</li>
                </ol>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  2. Безопасность платежей
                </h2>
                <p className="text-muted-foreground mb-4">
                  Безопасность ваших платежей — наш главный приоритет. Все платежи картами обрабатываются через FreedomPay, лицензированного провайдера платежных услуг в Кыргызской Республике.
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Соответствие PCI DSS:</strong> FreedomPay сертифицирован по стандарту безопасности данных индустрии платежных карт (PCI DSS) — высшему уровню безопасности для обработки платежей.</li>
                  <li><strong>Шифрование SSL/TLS:</strong> Все данные, передаваемые во время оплаты, шифруются с использованием 256-битного шифрования SSL/TLS.</li>
                  <li><strong>3D Secure:</strong> Дополнительный уровень аутентификации (Verified by Visa / Mastercard SecureCode) для усиленной защиты от мошенничества.</li>
                  <li><strong>Токенизация:</strong> Данные вашей карты токенизируются и никогда не хранятся на наших серверах в исходном виде.</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                  <Lock className="h-6 w-6" />
                  3. Защита данных
                </h2>
                <p className="text-muted-foreground mb-4">
                  Мы привержены защите ваших персональных и финансовых данных:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Номер карты:</strong> Мы никогда не видим, не храним и не имеем доступа к полному номеру вашей карты. Все данные карты обрабатываются непосредственно FreedomPay.</li>
                  <li><strong>CVV-код:</strong> Ваш код безопасности нигде не хранится и используется только для верификации транзакции.</li>
                  <li><strong>Записи о транзакциях:</strong> Мы храним только базовую информацию о транзакции (сумма, дата, последние 4 цифры карты) для бухгалтерских целей и ваших записей.</li>
                  <li><strong>Соответствие требованиям конфиденциальности:</strong> Вся обработка данных соответствует Закону Кыргызской Республики «О персональных данных».</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Согласие на обработку данных</h2>
                <div className="bg-muted/50 border border-border rounded-lg p-6">
                  <p className="text-muted-foreground mb-4">
                    Совершая платеж на нашем сайте, вы даете согласие на:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    <li>Обработку ваших персональных данных, как описано в нашей <Link to="/privacy-policy/ru" className="text-primary hover:underline">Политике конфиденциальности</Link></li>
                    <li>Передачу ваших платежных данных в FreedomPay для обработки транзакции</li>
                    <li>Условия нашей <Link to="/public-offer/ru" className="text-primary hover:underline">Публичной оферты</Link></li>
                    <li><Link to="/refund-policy/ru" className="text-primary hover:underline">Правила возврата денежных средств</Link>, применимые к вашей покупке</li>
                  </ul>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                  5. Важное предупреждение о безопасности
                </h2>
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6">
                  <p className="text-foreground font-semibold mb-4">
                    НИКОГДА не сообщайте свою конфиденциальную банковскую информацию никому, включая:
                  </p>
                  <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                    <li><strong>Полный номер карты</strong> по электронной почте, в мессенджере или по телефону</li>
                    <li><strong>CVV/CVC код безопасности</strong> (3-значный код на обратной стороне карты)</li>
                    <li><strong>ПИН-код</strong> вашей банковской карты</li>
                    <li><strong>Учетные данные интернет-банкинга</strong> (логин и пароль)</li>
                    <li><strong>SMS-коды подтверждения</strong> от вашего банка</li>
                    <li><strong>Пароли 3D Secure</strong></li>
                  </ul>
                  <p className="text-foreground mt-4">
                    <strong>Top Uni Consulting НИКОГДА не будет запрашивать эту информацию.</strong> Все законные платежи обрабатываются исключительно через защищенную страницу оплаты FreedomPay.
                  </p>
                  <p className="text-muted-foreground mt-4">
                    Если вы получили какой-либо запрос на эту информацию, якобы от нас, пожалуйста, немедленно сообщите об этом на <strong>topuniconsulting@gmail.com</strong>.
                  </p>
                </div>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Проблемы с платежом</h2>
                <p className="text-muted-foreground mb-4">
                  Если у вас возникли проблемы во время оплаты:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Платеж отклонен:</strong> Проверьте правильность данных карты и убедитесь, что ваша карта включена для онлайн-платежей. Свяжитесь с вашим банком, если проблема сохраняется.</li>
                  <li><strong>Двойное списание:</strong> Если вы считаете, что с вас списали дважды, немедленно свяжитесь с нами по адресу topuniconsulting@gmail.com с данными о транзакции. Мы проведем расследование и обработаем возврат при необходимости.</li>
                  <li><strong>Подтверждение платежа не получено:</strong> Проверьте папку «Спам». Если вы все еще не видите его, свяжитесь с нами для проверки статуса платежа.</li>
                  <li><strong>Технические ошибки:</strong> Очистите кеш браузера и попробуйте снова. Если проблемы сохраняются, попробуйте другой браузер или устройство.</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Валюта и ценообразование</h2>
                <p className="text-muted-foreground mb-4">
                  Все цены на нашем сайте отображаются в кыргызских сомах (KGS) как основная валюта, с приблизительными эквивалентами в долларах США для справки. Фактическое списание с вашей карты будет в KGS.
                </p>
                <p className="text-muted-foreground mb-4">
                  Для карт, выпущенных за пределами Кыргызской Республики, ваш банк конвертирует сумму в вашу местную валюту по текущему обменному курсу. Дополнительные комиссии за конвертацию валюты могут применяться в соответствии с политикой вашего банка.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Возвраты</h2>
                <p className="text-muted-foreground mb-4">
                  Возвраты за платежи картой обрабатываются на исходную платежную карту. Обратите внимание:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Возвраты обрабатываются в течение 5-10 рабочих дней после одобрения</li>
                  <li>Фактическое зачисление на ваш счет может занять дополнительно 5-14 рабочих дней в зависимости от вашего банка</li>
                  <li>Полные условия возврата см. в наших <Link to="/refund-policy/ru" className="text-primary hover:underline">Правилах возврата денежных средств</Link></li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Контактная информация</h2>
                <p className="text-muted-foreground mb-4">
                  По вопросам, связанным с оплатой, свяжитесь с нами:
                </p>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li><strong>Email:</strong> topuniconsulting@gmail.com</li>
                  <li><strong>Адрес:</strong> г. Бишкек, Кыргызская Республика</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Связанные документы</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><Link to="/privacy-policy/ru" className="text-primary hover:underline">Политика конфиденциальности</Link></li>
                  <li><Link to="/public-offer/ru" className="text-primary hover:underline">Публичная оферта</Link></li>
                  <li><Link to="/refund-policy/ru" className="text-primary hover:underline">Правила возврата денежных средств</Link></li>
                </ul>
              </section>
            </ScrollReveal>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground mb-2">
            Под руководством консультантов из Йеля, Гарварда, Кембриджа и Цинхуа
          </p>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Top Uni Consulting | Все права защищены
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PaymentInfoRu;
