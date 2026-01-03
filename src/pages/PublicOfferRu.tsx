import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";

const PublicOfferRu = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="ru" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Публичная оферта
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
                  Настоящий документ является официальной публичной офертой (предложением) компании Top Uni Consulting (далее — «Компания», «Исполнитель» или «мы») о заключении договора на оказание консультационных услуг в сфере образования (далее — «Услуги») на изложенных ниже условиях.
                </p>
                <p className="text-muted-foreground mb-4">
                  В соответствии со статьей 396 Гражданского кодекса Кыргызской Республики настоящий документ является публичной офертой, и при принятии изложенных ниже условий физическое или юридическое лицо, принимающее данную оферту, становится Клиентом (далее — «Клиент» или «вы»).
                </p>
                <p className="text-muted-foreground mb-4">
                  <strong>Акцептом оферты</strong> является полное и безоговорочное принятие условий настоящего Договора путем оплаты выбранных Услуг. Моментом акцепта является момент зачисления денежных средств на счет Компании.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">2. Определения</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Публичная оферта:</strong> предложение, адресованное неопределенному кругу лиц, содержащее все существенные условия договора</li>
                  <li><strong>Акцепт:</strong> полное и безоговорочное принятие условий настоящего Договора</li>
                  <li><strong>Услуги:</strong> консультационные услуги в сфере образования, включая, но не ограничиваясь: консультирование по поступлению в университеты, проверка заявок, редактирование эссе, подготовка к собеседованиям и стратегическое консультирование</li>
                  <li><strong>Консультация:</strong> запланированная сессия с консультантом Компании, проводимая лично или посредством видеоконференции</li>
                  <li><strong>Пакет:</strong> комплексный набор Услуг, предлагаемый по фиксированной цене</li>
                  <li><strong>Веб-сайт:</strong> topuniconsulting.com</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">3. Предмет договора</h2>
                <p className="text-muted-foreground mb-4">
                  3.1. Компания обязуется оказать Клиенту консультационные Услуги в сфере образования, а Клиент обязуется оплатить эти Услуги в соответствии с условиями настоящего Договора.
                </p>
                <p className="text-muted-foreground mb-4">
                  3.2. Конкретный объем, содержание и стоимость Услуг определяются выбранным пакетом или типом консультации, как описано на Веб-сайте на момент покупки.
                </p>
                <p className="text-muted-foreground mb-4">
                  3.3. Услуги Компании включают, но не ограничиваются:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Индивидуальные консультации по выбору университета и стратегии подачи заявок</li>
                  <li>Проверка и редактирование эссе и мотивационных писем</li>
                  <li>Консультации по внеучебной деятельности и формированию профиля</li>
                  <li>Подготовка к собеседованиям и пробные собеседования</li>
                  <li>Управление графиком подачи заявок и отслеживание дедлайнов</li>
                  <li>Консультации по финансовой помощи и стипендиям</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Права и обязанности Компании</h2>
                <h3 className="text-xl font-medium mt-6 mb-3">4.1. Компания обязана:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Оказывать Услуги в соответствии с выбранным пакетом или типом консультации</li>
                  <li>Оказывать Услуги силами квалифицированных специалистов с соответствующим опытом и экспертизой</li>
                  <li>Обеспечивать конфиденциальность информации Клиента в соответствии с Политикой конфиденциальности</li>
                  <li>Отвечать на запросы Клиента в разумные сроки</li>
                  <li>Обеспечивать доступ к запланированным консультациям в согласованное время</li>
                  <li>Выдавать квитанции и документацию на полученные платежи</li>
                </ul>
                
                <h3 className="text-xl font-medium mt-6 mb-3">4.2. Компания имеет право:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Запрашивать у Клиента всю информацию, необходимую для оказания Услуг</li>
                  <li>Переносить консультации с уведомлением не менее чем за 24 часа</li>
                  <li>Приостанавливать оказание Услуг в случае неполучения или оспаривания оплаты</li>
                  <li>Изменять условия настоящего Договора с предварительным уведомлением существующих Клиентов</li>
                  <li>Отказать в обслуживании Клиентам, нарушающим условия настоящего Договора</li>
                  <li>Привлекать сторонних специалистов для определенных аспектов оказания Услуг</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">5. Права и обязанности Клиента</h2>
                <h3 className="text-xl font-medium mt-6 mb-3">5.1. Клиент обязан:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Предоставлять точную и полную информацию, необходимую для оказания Услуг</li>
                  <li>Своевременно оплачивать выбранные Услуги</li>
                  <li>Присутствовать на запланированных консультациях в согласованное время или уведомлять о переносе не менее чем за 24 часа</li>
                  <li>Уважать права интеллектуальной собственности Компании и ее консультантов</li>
                  <li>Не передавать и не распространять материалы, предоставленные Компанией, третьим лицам</li>
                  <li>Соблюдать сроки подачи материалов на проверку</li>
                </ul>
                
                <h3 className="text-xl font-medium mt-6 mb-3">5.2. Клиент имеет право:</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Получать Услуги того качества и объема, которые описаны в выбранном пакете</li>
                  <li>Запрашивать разъяснения по любому аспекту Услуг</li>
                  <li>Переносить консультации с уведомлением не менее чем за 24 часа</li>
                  <li>Запрашивать возврат средств в соответствии с Правилами возврата</li>
                  <li>Получать доступ к записям своих консультаций и поданным материалам</li>
                  <li>Получать квитанции и документацию на произведенные платежи</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Активация и оказание Услуг</h2>
                <p className="text-muted-foreground mb-4">
                  6.1. Услуги активируются после получения Компанией оплаты. Клиент получит подтверждение оплаты и активации услуг по электронной почте.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.2. Консультации назначаются через онлайн-систему бронирования Компании (Calendly) после подтверждения оплаты.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.3. Услуги пакета должны быть использованы в течение 12 месяцев с даты покупки, если не указано иное.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.4. Индивидуальные консультации должны быть назначены в течение 30 дней после покупки и проведены в течение 60 дней.
                </p>
                <p className="text-muted-foreground mb-4">
                  6.5. Неиспользованные услуги не переносятся и не подлежат возврату после истечения указанного срока действия.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Условия оплаты</h2>
                <p className="text-muted-foreground mb-4">
                  7.1. Цены на Услуги отображаются на Веб-сайте в кыргызских сомах (KGS) как основная валюта, с указанием приблизительных эквивалентов в долларах США для справки.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.2. Оплата производится через платежную систему FreedomPay, которая принимает банковские карты (Visa, Mastercard, Элкарт) и банковские переводы.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.3. Оплата считается завершенной после зачисления средств на счет Компании.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.4. Компания оставляет за собой право предоставлять рекламные скидки и промокоды по своему усмотрению.
                </p>
                <p className="text-muted-foreground mb-4">
                  7.5. Все цены включают применимые налоги. Дополнительные сборы не взимаются, если это явно не указано.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Отказ от ответственности и ограничения</h2>
                <p className="text-muted-foreground mb-4">
                  8.1. <strong>Отсутствие гарантии поступления:</strong> Компания оказывает консультационные услуги для повышения качества заявок в университеты. Компания не гарантирует и не может гарантировать поступление в какой-либо университет или программу, поскольку решения о зачислении принимаются исключительно образовательными учреждениями.
                </p>
                <p className="text-muted-foreground mb-4">
                  8.2. Клиент признает, что успех зависит от многих факторов, находящихся вне контроля Компании, включая, но не ограничиваясь: академической квалификацией, политикой университетов, конкуренцией и сроками подачи заявок.
                </p>
                <p className="text-muted-foreground mb-4">
                  8.3. Ответственность Компании ограничена суммой, уплаченной за Услуги. Компания не несет ответственности за косвенные, последующие или случайные убытки.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Изменение и расторжение</h2>
                <p className="text-muted-foreground mb-4">
                  9.1. Компания может изменять условия настоящего Договора в любое время. Изменения вступают в силу с момента публикации на Веб-сайте.
                </p>
                <p className="text-muted-foreground mb-4">
                  9.2. Существующие Клиенты будут уведомлены о существенных изменениях по электронной почте не менее чем за 14 дней до вступления изменений в силу.
                </p>
                <p className="text-muted-foreground mb-4">
                  9.3. Любая из сторон может расторгнуть Договор письменным уведомлением. Расторжение не влияет на Услуги, уже оплаченные и оказанные.
                </p>
                <p className="text-muted-foreground mb-4">
                  9.4. Компания может немедленно расторгнуть Договор, если Клиент нарушает его условия или занимается мошеннической деятельностью.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">10. Разрешение споров</h2>
                <p className="text-muted-foreground mb-4">
                  10.1. Любые споры, возникающие из настоящего Договора, разрешаются путем переговоров между сторонами.
                </p>
                <p className="text-muted-foreground mb-4">
                  10.2. Если спор не может быть разрешен путем переговоров в течение 30 дней, он передается в суды Кыргызской Республики в соответствии с применимым законодательством.
                </p>
                <p className="text-muted-foreground mb-4">
                  10.3. Настоящий Договор регулируется законодательством Кыргызской Республики.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">11. Реквизиты Компании</h2>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li><strong>Название компании:</strong> Top Uni Consulting</li>
                  <li><strong>Адрес:</strong> г. Бишкек, Кыргызская Республика</li>
                  <li><strong>Email:</strong> topuniconsulting@gmail.com</li>
                  <li><strong>Веб-сайт:</strong> topuniconsulting.com</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Связанные документы</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><Link to="/privacy-policy/ru" className="text-primary hover:underline">Политика конфиденциальности</Link></li>
                  <li><Link to="/refund-policy/ru" className="text-primary hover:underline">Правила возврата денежных средств</Link></li>
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

export default PublicOfferRu;
