/*
 * Word lists for on-device people and place recognition. All entries are
 * folded (see text.ts: lowercase, no diacritics).
 */

const list = (s: string) => new Set(s.trim().split(/\s+/));

/** Common Turkish given names. Recognition leans on this list, not on capital letters alone. */
export const FIRST_NAMES = list(`
ahmet mehmet mustafa ali huseyin hasan ibrahim ismail osman yusuf murat omer ramazan halil suleyman abdullah mahmut
recep salih fatih kadir emre hakan adem kemal yasar bayram serkan orhan burak gokhan erkan onur cem can kaan
kerem emir eren mert berk arda baris alp alper tolga volkan sinan serdar selim tuncay tuncer levent erdem erhan
cenk cihan cagri cagatay batuhan berkay burcu enes furkan gurkan hamza harun ilker kaya koray kutay mazhar
melih metin necati nihat okan ozan ozgur ozkan polat rasit riza sait savas sedat sefa semih serhat sezer sami
taha tamer taner tarik tayfun tugay tugrul ufuk ugur umit utku yakup yavuz yigit yunus yusuf zafer ziya
batu bora deniz doruk efe ege egemen emin engin ersin evren firat gorkem hakki ilhan ilyas kagan kutlu
mirac nazim necdet nevzat oguz oguzhan onder orkun ozer ridvan sarp selcuk serkan sertac tan tunc tunahan
umut yagiz yasin yilmaz yunus zeki aykut aydin ayhan bulent cemal cengiz cetin davut dogan dursun ekrem
ercan erol fahri ferhat fikret halis haluk hayri hikmet idris irfan kazim lutfu mesut muammer nuri ozcan
remzi sabri sadik sahin sener sukru tahsin talat tekin turgay turan vedat yalcin yasar zekeriya
ayse fatma emine hatice zeynep elif meryem sultan zehra hanife merve ozlem yasemin esra leyla hulya songul
sevgi derya filiz gulsen aysel ebru ozge seda sibel serap nurcan tugba busra kubra buse gizem irem ece
ceren cansu damla dilara duygu ecem ela elvan esma ezgi gamze gulay gulsum hande hazal ilayda ipek kader
kevser lale melek melike merve mine nazli nehir nil nisa nur nurhan oya pelin pinar rabia reyhan rukiye
sena selin selma serpil sevda sevil sila simge sinem tuba tulay ceyda asli asena aylin aynur aysegul aysun
azra bahar banu basak begum belgin berfin beril berna betul beyza bilge birsen buket burcin cagla canan
cemile ceyhan defne dilek dilan eda esin feride feyza gonca gulnur gulbahar gulizar gulten gunes hacer
handan havva hilal ilknur inci jale kiraz lamia meltem mukaddes munevver nalan nazan nergis neslihan
nesrin nilay nilufer nihan nuray nursel oznur pembe perihan rana saadet sabiha sacide safiye saniye
sevim seyma sirin suna sude sukran tulin tulay umay ulku umran yagmur yeliz yesim yildiz zuhal zerrin
arzu bengu bensu berra cemre duru elcin elif eylul ilgin lara mira naz nazli neva ruya selin tuana zumra
aras atlas kuzey poyraz miran alparslan asaf ayaz bartu cinar demir ediz eymen kayra mete ozan tuna
`);

/** Given names that are also everyday words; accepted only with clear name signals. */
export const AMBIGUOUS_NAMES = list(`
deniz umut yagmur bahar gunes yildiz can baris kader sevgi ruya damla inci lale kiraz nur ay tan demir
cinar kuzey ege sultan melek pembe umit kaya dogan sahin aslan yilmaz bilge sena naz ela ipek sila
`);

/** Capitalised words and short phrases that are never people: brands, apps, services, AI assistants. */
export const NOT_PEOPLE = list(`
claude chatgpt gpt gemini copilot openai anthropic siri alexa google youtube instagram whatsapp twitter
tiktok facebook linkedin netflix spotify discord telegram zoom teams slack excel word powerpoint outlook
gmail iphone ipad android samsung apple microsoft amazon trendyol hepsiburada getir yemeksepeti migros
bim sok starbucks turkcell vodafone telekom turktelekom superonline tesla bmw mercedes ford toyota renault
fiat hyundai honda netflix disney exxen blutv gain mubi steam playstation xbox nintendo pinterest reddit
uber bitaksi marti ikea zara lcw koton mavi boyner decathlon sahibinden letgo dolap e-devlet edevlet
sgk mhrs enabiz hes kyk yok osym ales kpss yks lgs tus dus yds toefl ielts
`);

/** Words that turn a capitalised phrase into a title, department or organisation ("İnsan Kaynakları Uzmanı"). */
export const TITLE_WORDS = list(`
uzmani uzman muduru mudur mudurlugu mudurlugunde kaynaklari kaynak bolumu bolum departmani departman
sorumlusu sorumlu yoneticisi yonetici baskani baskan genel mudur asistani asistan danismani danisman
muhendisi muhendis sefi sef koordinatoru koordinator temsilcisi temsilci uzmanligi ogretmeni ogretmen
bakanligi bakanlik universitesi universite fakultesi fakulte lisesi lise okulu hastanesi hastane
sirketi sirket holding bankasi banka belediyesi belediye dernegi dernek vakfi vakif kulubu kulup
merkezi merkez enstitusu kurumu kurum ajansi ajans magazasi market kafe cafe restoran restaurant
hizmetleri hizmet satis pazarlama muhasebe finans insan bilgi islem teknolojileri teknoloji
kurulu kurul meclisi meclis takimi takim projesi proje dizisi dizi filmi film kitabi kitap
`);

/** Grammar and everyday words that often start a sentence with a capital letter. */
export const FUNCTION_WORDS = list(`
ben sen o biz siz onlar beni bana benim benden seni sana senin senden onu ona onun ondan bizi bize bizim
sizi size sizin onlari onlara onlarin kendim kendimi kendime kendini bugun dun yarin sonra once ama fakat
ve ile cunku bir bu su her hic cok az belki sanirim aslinda sabah ogle aksam gece simdi yine hala neyse
ayrica bence galiba tamam evet hayir merhaba sevgili gunluk allah insallah masallah tanri rabbim
nasil neden ne kim kimse herkes hep hicbir bazen genelde oysa ancak yani iste peki hani daha en ilk son
bunu buna bunun bundan sunu suna onca boyle soyle oyle ozellikle mesela ornegin tabii elbette ah of
eve evde evden ise iste okula okulda yolda disari icerde
pazartesi sali carsamba persembe cuma cumartesi pazar
ocak subat mart nisan mayis haziran temmuz agustos eylul ekim kasim aralik
turkiye turkce ingilizce almanca turk alman ingiliz ramazan bayram kurban yilbasi
hoca doktor abi abla kahve cay film dizi okul is ev
`);

/** Turkish provinces, big districts and common destinations. */
export const PLACES = list(`
adana adiyaman afyon afyonkarahisar agri aksaray amasya ankara antalya ardahan artvin aydin balikesir
bartin batman bayburt bilecik bingol bitlis bolu burdur bursa canakkale cankiri corum denizli diyarbakir
duzce edirne elazig erzincan erzurum eskisehir gaziantep giresun gumushane hakkari hatay igdir isparta
istanbul izmir kahramanmaras karabuk karaman kars kastamonu kayseri kilis kirikkale kirklareli kirsehir
kocaeli izmit konya kutahya malatya manisa mardin mersin mugla mus nevsehir nigde ordu osmaniye rize
sakarya adapazari samsun sanliurfa urfa siirt sinop sirnak sivas tekirdag tokat trabzon tunceli usak van
yalova yozgat zonguldak bodrum marmaris fethiye kas alanya cesme kapadokya kadikoy besiktas uskudar
taksim moda cihangir karakoy alsancak kizilay beyoglu sisli bakirkoy atasehir maltepe kartal pendik
kibris lefkosa girne magosa paris londra berlin roma amsterdam tokyo barcelona viyana prag madrid
milano munih brüksel bruksel atina dubai bakü baku tiflis moskova kiev newyork amerika almanya ingiltere
fransa italya ispanya hollanda yunanistan rusya japonya cin kanada avustralya azerbaycan gurcistan iran
irak suriye misir fas avrupa asya afrika karadeniz ege akdeniz marmara anadolu trakya
`);
