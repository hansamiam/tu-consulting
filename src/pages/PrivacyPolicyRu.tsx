import Navigation from "@/components/Navigation";
import { ScrollProgress } from "@/components/ScrollProgress";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Link } from "react-router-dom";

const PrivacyPolicyRu = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollProgress />
      <Navigation language="ru" />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-8">
              Политика конфиденциальности
            </h1>
            <p className="text-muted-foreground mb-8">
              Последнее обновление: Январь 2025
            </p>
          </ScrollReveal>

          <div className="prose prose-lg max-w-none text-foreground">
            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">1. Введение</h2>
                <p className="text-muted-foreground mb-4">
                  Компания Top Uni Consulting (далее — «Компания», «мы», «нас» или «наш») привержена защите конфиденциальности и персональных данных наших клиентов и посетителей сайта. Настоящая Политика конфиденциальности разъясняет, как мы собираем, используем, храним и защищаем вашу персональную информацию в соответствии с законодательством Кыргызской Республики, включая Закон Кыргызской Республики «О персональных данных» от 14 апреля 2008 года № 58.
                </p>
                <p className="text-muted-foreground mb-4">
                  Используя наш веб-сайт и услуги, вы даете согласие на сбор и обработку ваших персональных данных, как описано в настоящей Политике конфиденциальности.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">2. Оператор персональных данных</h2>
                <p className="text-muted-foreground mb-4">
                  Оператором, ответственным за ваши персональные данные, является:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Название компании:</strong> Top Uni Consulting</li>
                  <li><strong>Адрес:</strong> г. Бишкек, Кыргызская Республика</li>
                  <li><strong>Email:</strong> topuniconsulting@gmail.com</li>
                  <li><strong>Веб-сайт:</strong> topuniconsulting.com</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">3. Какие персональные данные мы собираем</h2>
                <p className="text-muted-foreground mb-4">
                  Мы собираем следующие категории персональных данных:
                </p>
                
                <h3 className="text-xl font-medium mt-6 mb-3">3.1 Информация, которую вы предоставляете напрямую</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Контактная информация:</strong> ФИО, адрес электронной почты, номер телефона, почтовый адрес</li>
                  <li><strong>Образовательная информация:</strong> текущая школа/университет, класс/курс, академические записи, результаты стандартизированных тестов (SAT, ACT, IELTS, TOEFL и др.)</li>
                  <li><strong>Материалы для поступления:</strong> личные эссе, мотивационные письма, резюме, внеучебная деятельность, достижения и рекомендации</li>
                  <li><strong>Платежная информация:</strong> записи о транзакциях, квитанции об оплате (примечание: фактические данные платежных карт обрабатываются безопасно компанией FreedomPay и никогда не хранятся на наших серверах)</li>
                  <li><strong>Записи консультаций:</strong> заметки с консультаций, история общения, предпочтения по услугам</li>
                </ul>

                <h3 className="text-xl font-medium mt-6 mb-3">3.2 Автоматически собираемая информация</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Информация об устройстве:</strong> IP-адрес, тип браузера, операционная система, идентификаторы устройства</li>
                  <li><strong>Данные использования:</strong> посещенные страницы, время на сайте, источники перехода, паттерны кликов</li>
                  <li><strong>Cookies и отслеживание:</strong> сессионные cookies, аналитические данные (см. Раздел 8 о политике cookies)</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">4. Цели и правовые основания обработки</h2>
                <p className="text-muted-foreground mb-4">
                  Мы обрабатываем ваши персональные данные в следующих целях:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Оказание услуг:</strong> предоставление консультационных услуг по поступлению в университеты, включая проверку заявок, редактирование эссе, подготовку к собеседованиям и стратегическое консультирование</li>
                  <li><strong>Коммуникация:</strong> ответы на запросы, планирование консультаций, отправка обновлений об услугах и поддержка клиентов</li>
                  <li><strong>Обработка платежей:</strong> проведение платежей за услуги через нашего платежного партнера FreedomPay</li>
                  <li><strong>Соблюдение законодательства:</strong> соответствие применимым законам, нормативным актам и правовым процедурам Кыргызской Республики</li>
                  <li><strong>Улучшение услуг:</strong> анализ паттернов использования и улучшение нашего веб-сайта и услуг</li>
                  <li><strong>Маркетинг (с согласия):</strong> отправка рекламных материалов о наших услугах с вашего явного согласия</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Правовые основания для обработки включают: ваше согласие, исполнение договора, законные интересы и правовые обязательства по законодательству Кыргызстана.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">5. Хранение и безопасность данных</h2>
                <p className="text-muted-foreground mb-4">
                  Мы применяем надежные меры безопасности для защиты ваших персональных данных:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Шифрование:</strong> все данные, передаваемые между вашим браузером и нашими серверами, шифруются с использованием SSL/TLS (256-битное шифрование)</li>
                  <li><strong>Безопасное хранение:</strong> персональные данные хранятся на защищенных серверах с ограниченным контролем доступа</li>
                  <li><strong>Контроль доступа:</strong> только уполномоченные сотрудники с законной необходимостью имеют доступ к персональным данным</li>
                  <li><strong>Безопасность платежей:</strong> данные платежных карт обрабатываются исключительно компанией FreedomPay с использованием систем, соответствующих стандарту PCI DSS; мы никогда не храним номера карт, CVV-коды или другую конфиденциальную платежную информацию</li>
                  <li><strong>Регулярные проверки:</strong> мы проводим регулярные проверки безопасности и обновления наших систем</li>
                </ul>
                
                <h3 className="text-xl font-medium mt-6 mb-3">Сроки хранения данных</h3>
                <p className="text-muted-foreground mb-4">
                  Мы храним ваши персональные данные в течение периода, необходимого для выполнения целей, изложенных в настоящей политике:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Данные активных клиентов: срок оказания услуг плюс 3 года</li>
                  <li>Финансовые записи: 5 лет в соответствии с налоговым законодательством Кыргызстана</li>
                  <li>Записи о маркетинговом согласии: до отзыва согласия</li>
                  <li>Аналитика веб-сайта: 26 месяцев</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">6. Ваши права</h2>
                <p className="text-muted-foreground mb-4">
                  В соответствии с законодательством Кыргызской Республики вы имеете следующие права в отношении ваших персональных данных:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Право на доступ:</strong> запросить информацию о том, какие персональные данные мы храним о вас</li>
                  <li><strong>Право на исправление:</strong> запросить исправление неточных или неполных данных</li>
                  <li><strong>Право на удаление:</strong> запросить удаление ваших персональных данных (с учетом законодательных требований о хранении)</li>
                  <li><strong>Право на ограничение обработки:</strong> запросить ограничение использования ваших данных</li>
                  <li><strong>Право на возражение:</strong> возражать против обработки ваших данных для определенных целей</li>
                  <li><strong>Право на отзыв согласия:</strong> отозвать ранее данное согласие в любое время</li>
                  <li><strong>Право на подачу жалобы:</strong> подать жалобу в соответствующий орган по защите данных в Кыргызской Республике</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Для реализации любого из этих прав, пожалуйста, свяжитесь с нами по адресу <strong>topuniconsulting@gmail.com</strong>. Мы ответим на ваш запрос в течение 30 дней.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">7. Передача и раскрытие данных</h2>
                <p className="text-muted-foreground mb-4">
                  Мы не продаем ваши персональные данные. Мы можем передавать вашу информацию только в следующих случаях:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Поставщики услуг:</strong> доверенным третьим лицам, которые помогают в ведении нашего бизнеса (например, FreedomPay для обработки платежей, календарные сервисы для планирования)</li>
                  <li><strong>Законные требования:</strong> когда это требуется по закону, решению суда или государственным органом Кыргызской Республики</li>
                  <li><strong>С вашего согласия:</strong> когда вы явно разрешили нам передать информацию (например, университетам в процессе подачи заявки)</li>
                  <li><strong>Корпоративные сделки:</strong> в связи с любым слиянием, приобретением или продажей активов компании</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Все поставщики услуг договорно обязаны защищать ваши данные и использовать их только для указанных целей.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">8. Cookies и технологии отслеживания</h2>
                <p className="text-muted-foreground mb-4">
                  Наш веб-сайт использует cookies и аналогичные технологии для улучшения вашего опыта:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Обязательные cookies:</strong> необходимы для базовой функциональности веб-сайта</li>
                  <li><strong>Аналитические cookies:</strong> помогают нам понять, как посетители используют наш сайт</li>
                  <li><strong>Cookies предпочтений:</strong> запоминают ваши настройки и предпочтения (например, выбор языка)</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Вы можете контролировать настройки cookies через настройки вашего браузера. Обратите внимание, что отключение определенных cookies может повлиять на функциональность веб-сайта.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">9. Конфиденциальность детей</h2>
                <p className="text-muted-foreground mb-4">
                  Наши услуги предназначены для лиц в возрасте от 14 лет. Для клиентов младше 18 лет мы требуем согласие родителя или опекуна перед сбором персональных данных. Родители/опекуны могут просматривать, изменять или запрашивать удаление информации своего ребенка, связавшись с нами.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">10. Международная передача данных</h2>
                <p className="text-muted-foreground mb-4">
                  В рамках наших консультационных услуг по поступлению в университеты некоторые ваши данные могут обрабатываться или передаваться на международном уровне (например, университетам за рубежом по вашему запросу). В таких случаях мы обеспечиваем надлежащие меры защиты ваших данных в соответствии с законодательством Кыргызстана.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">11. Изменения в настоящей Политике</h2>
                <p className="text-muted-foreground mb-4">
                  Мы можем время от времени обновлять настоящую Политику конфиденциальности. Любые изменения будут опубликованы на этой странице с обновленной датой «Последнее обновление». О существенных изменениях мы сообщим по электронной почте или через уведомление на веб-сайте. Продолжение использования наших услуг после изменений означает принятие обновленной политики.
                </p>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">12. Связаться с нами</h2>
                <p className="text-muted-foreground mb-4">
                  Если у вас есть вопросы о настоящей Политике конфиденциальности или вы хотите реализовать свои права на данные, пожалуйста, свяжитесь с нами:
                </p>
                <ul className="list-none text-muted-foreground space-y-2">
                  <li><strong>Email:</strong> team@topuniconsulting.com</li>
                  <li><strong>Адрес:</strong> г. Бишкек, Кыргызская Республика</li>
                </ul>
              </section>
            </ScrollReveal>

            <ScrollReveal>
              <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-4">Связанные документы</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><Link to="/public-offer/ru" className="text-primary hover:underline">Публичная оферта</Link></li>
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

export default PrivacyPolicyRu;
