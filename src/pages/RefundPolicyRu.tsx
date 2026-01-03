import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";

const RefundPolicyRu = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="ru" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Правила возврата денежных средств
            </h1>
            <p className="text-muted-foreground mb-8">
              Последнее обновление: Январь 2025
            </p>
          </ScrollReveal>

          <div className="prose prose-lg max-w-none text-foreground">
            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">1. Общие положения</h2>
                <p className="text-muted-foreground mb-4">
                  Настоящие Правила возврата денежных средств определяют условия, при которых компания Top Uni Consulting (далее — «Компания», «мы», «нас» или «наш») осуществляет возврат денежных средств за консультационные услуги в сфере образования. Настоящие правила регулируются законодательством Кыргызской Республики, включая Закон «О защите прав потребителей».
                </p>
                <p className="text-muted-foreground mb-4">
                  Приобретая наши услуги, вы соглашаетесь с условиями настоящих Правил возврата. Мы рекомендуем внимательно ознакомиться с данными правилами перед совершением покупки.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">2. Индивидуальные консультации</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">2.1 Условия полного возврата</h3>
                <p className="text-muted-foreground mb-4">
                  Полный возврат средств за индивидуальные консультации осуществляется в следующих случаях:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Отмена до назначения консультации:</strong> Если вы запрашиваете возврат до назначения консультации, вам полагается полный возврат за вычетом комиссии за обработку платежа (обычно 2-3%).</li>
                  <li><strong>Отмена за 48+ часов:</strong> Если вы отменяете назначенную консультацию не менее чем за 48 часов до запланированного времени, вам полагается полный возврат за вычетом комиссии за обработку.</li>
                  <li><strong>Отмена со стороны Компании:</strong> Если Компания отменяет консультацию по любой причине, вам полагается полный возврат или перенос на другое время по вашему выбору.</li>
                  <li><strong>Технические проблемы с нашей стороны:</strong> Если консультация не может быть проведена из-за технических проблем со стороны Компании, которые не могут быть устранены в течение 15 минут, вам полагается полный возврат или перенос.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">2.2 Условия частичного возврата</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Отмена за 24-48 часов:</strong> Если вы отменяете консультацию за 24-48 часов до назначенного времени, вам полагается возврат в размере 50%.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">2.3 Условия отсутствия возврата</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Отмена менее чем за 24 часа</li>
                  <li>Неявка без предварительного уведомления</li>
                  <li>Консультация была проведена (оказанные услуги)</li>
                  <li>Технические проблемы со стороны клиента (интернет, оборудование и т.д.)</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">3. Пакеты услуг</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">3.1 Условия полного возврата</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>В течение 7 дней с момента покупки, до первой консультации:</strong> Если вы запрашиваете возврат в течение 7 календарных дней после покупки пакета И до назначения первой консультации, вам полагается полный возврат за вычетом комиссии за обработку платежа.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">3.2 Условия частичного возврата</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>После первой консультации, но в течение 14 дней:</strong> Если вы запрашиваете возврат после первой консультации, но в течение 14 дней с момента покупки, вы можете получить возврат за неиспользованные услуги по следующей формуле:
                    <br /><br />
                    <em>Сумма возврата = (Общая стоимость пакета - Стоимость оказанных услуг) × 0.80</em>
                    <br /><br />
                    Административный сбор в размере 20% удерживается из оставшейся суммы.
                  </li>
                  <li><strong>Проблемы с качеством услуг:</strong> Если вы считаете, что качество услуг не соответствует заявленным стандартам, вы можете подать жалобу в течение 7 дней после оказания соответствующей услуги. Мы проведем расследование и можем предложить частичный возврат или кредит по нашему усмотрению.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">3.3 Условия отсутствия возврата</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Прошло более 14 дней с момента покупки</li>
                  <li>Использовано более 50% услуг пакета</li>
                  <li>Истек срок действия пакета (12 месяцев)</li>
                  <li>Акционные или скидочные пакеты (если не указано иное)</li>
                  <li>Клиент нарушил условия оказания услуг</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Особые обстоятельства</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">4.1 Медицинские экстренные случаи</h3>
                <p className="text-muted-foreground mb-4">
                  В случае документально подтвержденных медицинских экстренных ситуаций, затрагивающих вас или ближайших родственников, мы можем предоставить полный или частичный возврат независимо от стандартных правил. Может потребоваться документация (например, справка от врача).
                </p>

                <h3 className="text-xl font-medium mt-6 mb-3">4.2 Форс-мажорные обстоятельства</h3>
                <p className="text-muted-foreground mb-4">
                  В случае форс-мажорных обстоятельств (стихийные бедствия, война, действия государственных органов, пандемические ограничения), препятствующих оказанию услуг, возвраты рассматриваются индивидуально с учетом интересов обеих сторон.
                </p>

                <h3 className="text-xl font-medium mt-6 mb-3">4.3 Недоступность услуг</h3>
                <p className="text-muted-foreground mb-4">
                  Если мы не можем предоставить запланированные услуги из-за недоступности консультанта или закрытия компании, вы получите полный возврат за неоказанные услуги.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">5. Процедура возврата</h2>
                
                <h3 className="text-xl font-medium mt-6 mb-3">5.1 Как запросить возврат</h3>
                <p className="text-muted-foreground mb-4">
                  Для запроса возврата выполните следующие действия:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                  <li>Отправьте письмо на <strong>topuniconsulting@gmail.com</strong> с темой «Запрос на возврат»</li>
                  <li>Укажите в письме:
                    <ul className="list-disc pl-6 mt-2 space-y-1">
                      <li>Ваше полное имя</li>
                      <li>Дату покупки</li>
                      <li>Приобретенную услугу/пакет</li>
                      <li>Причину запроса возврата</li>
                      <li>Квитанцию об оплате или идентификатор транзакции</li>
                    </ul>
                  </li>
                  <li>Мы подтвердим получение вашего запроса в течение 3 рабочих дней</li>
                  <li>Решение будет сообщено в течение 10 рабочих дней после получения всей необходимой информации</li>
                </ol>

                <h3 className="text-xl font-medium mt-6 mb-3">5.2 Сроки обработки</h3>
                <p className="text-muted-foreground mb-4">
                  После одобрения возврата:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Платежи банковскими картами (через FreedomPay):</strong> Возврат будет обработан в течение 5-10 рабочих дней. Средства будут возвращены на исходную платежную карту. Фактическое поступление средств зависит от вашего банка и может занять дополнительно 5-14 рабочих дней.</li>
                  <li><strong>Банковские переводы:</strong> Возврат будет обработан в течение 5-10 рабочих дней на исходный банковский счет.</li>
                  <li><strong>Другие способы оплаты:</strong> Сроки обработки могут варьироваться. Мы сообщим вам ожидаемые сроки.</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">5.3 Комиссии за обработку</h3>
                <p className="text-muted-foreground mb-4">
                  Комиссии за обработку платежей (взимаемые FreedomPay и банками) не подлежат возврату, за исключением случаев, когда возврат происходит по нашей ошибке или при отмене со стороны Компании. Эти комиссии обычно составляют 2-3% от суммы транзакции.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Споры</h2>
                <p className="text-muted-foreground mb-4">
                  Если вы не согласны с нашим решением о возврате, вы можете:
                </p>
                <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
                  <li><strong>Запросить пересмотр:</strong> Отправьте подробное объяснение на topuniconsulting@gmail.com. Старший сотрудник нашей команды рассмотрит ваше дело в течение 14 рабочих дней.</li>
                  <li><strong>Официальная жалоба:</strong> Если вы по-прежнему не удовлетворены, вы можете подать официальную жалобу в органы защиты прав потребителей Кыргызской Республики.</li>
                  <li><strong>Судебное обращение:</strong> В крайнем случае споры могут быть разрешены через суды Кыргызской Республики в соответствии с применимым законодательством.</li>
                </ol>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Альтернативные меры</h2>
                <p className="text-muted-foreground mb-4">
                  В некоторых случаях вместо возврата мы можем предложить:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Сервисный кредит:</strong> Кредит на будущие услуги с продленным сроком действия</li>
                  <li><strong>Обмен услуг:</strong> Обмен на другую услугу равной или меньшей стоимости</li>
                  <li><strong>Перенос:</strong> Перенос консультаций на более удобное время</li>
                  <li><strong>Дополнительные услуги:</strong> Бесплатные дополнительные услуги для решения вопросов качества</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Эти альтернативы предлагаются по нашему усмотрению и требуют вашего согласия.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Изменения в настоящих Правилах</h2>
                <p className="text-muted-foreground mb-4">
                  Мы оставляем за собой право изменять настоящие Правила возврата в любое время. Изменения вступают в силу после публикации на нашем веб-сайте. К вашей транзакции применяются правила, действовавшие на момент покупки.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Контактная информация</h2>
                <p className="text-muted-foreground mb-4">
                  Для запросов на возврат или вопросов о настоящих правилах свяжитесь с нами:
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
                  <li><Link to="/payment-info/ru" className="text-primary hover:underline">Оплата банковской картой</Link></li>
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
            © 2025 Top Uni Consulting | Все права защищены
          </p>
        </div>
      </footer>
    </div>
  );
};

export default RefundPolicyRu;
