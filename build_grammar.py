# Builds docs/playground/bank-grammatik.json (B1 grammar drills, one correct option each)
import json
S='Welcher Satz ist richtig?'
T=[]
def topic(id,name,tip,items):
    T.append({'id':id,'name':name,'tip':tip,'items':items})
topic('verb','Verbposition im Hauptsatz','Das konjugierte Verb steht im Hauptsatz immer an Position 2. Infinitiv oder Partizip stehen am Ende.',[
(S,'Heute Abend gehe ich ins Kino.',['Heute Abend ich gehe ins Kino.','Heute Abend ins Kino gehe ich.'],'Nach „Heute Abend“ (Position 1) kommt sofort das Verb, dann das Subjekt.'),
(S,'Am Montag habe ich einen Termin.',['Am Montag ich habe einen Termin.','Am Montag einen Termin habe ich.'],'Position 1 = „Am Montag“, Position 2 = Verb „habe“.'),
(S,'Ich möchte morgen früh anrufen.',['Ich möchte anrufen morgen früh.','Ich anrufen möchte morgen früh.'],'Modalverb auf Position 2, der Infinitiv „anrufen“ steht am Ende.'),
(S,'Wegen des Wetters bleiben wir zu Hause.',['Wegen des Wetters wir bleiben zu Hause.','Wegen des Wetters zu Hause bleiben wir.'],'Vor dem Verb steht nur ein Satzteil („Wegen des Wetters“).'),
(S,'Gestern hat er mich angerufen.',['Gestern er hat mich angerufen.','Gestern hat er angerufen mich.'],'Perfekt: „hat“ auf Position 2, Partizip „angerufen“ am Satzende.'),
(S,'Können Sie mir bitte helfen?',['Können Sie bitte helfen mir?','Sie können helfen mir bitte?'],'Ja/Nein-Frage: Das Verb steht an Position 1, der Infinitiv am Ende.'),
(S,'Wann kommt der Bus?',['Wann der Bus kommt?','Wann kommen der Bus?'],'W-Frage: Fragewort, dann Verb („kommt“), dann Subjekt. „Bus“ ist Singular.'),
(S,'Leider kann ich morgen nicht kommen.',['Leider ich kann morgen nicht kommen.','Leider kann ich kommen nicht morgen.'],'„Leider“ ist Position 1, das Verb „kann“ Position 2. „nicht“ steht vor dem Infinitiv.'),
(S,'Am Wochenende fahren wir nach Berlin.',['Am Wochenende wir fahren nach Berlin.','Am Wochenende nach Berlin fahren wir.'],'Zeitangabe auf Position 1, dann Verb, dann Subjekt (Inversion).'),
(S,'Ich habe gestern eine E-Mail geschrieben.',['Ich habe gestern geschrieben eine E-Mail.','Ich gestern habe eine E-Mail geschrieben.'],'Das Partizip „geschrieben“ steht am Ende (Satzklammer).')])
topic('neben','Nebensatz: Verb am Ende','Im Nebensatz (weil, dass, ob, wenn, obwohl, wann, wo …) steht das konjugierte Verb am Ende.',[
(S,'Ich weiß, dass er morgen kommt.',['Ich weiß, dass er kommt morgen.','Ich weiß, dass kommt er morgen.'],'Nach „dass“ steht das Verb am Ende.'),
(S,'Er sagt, dass er keine Zeit hat.',['Er sagt, dass er hat keine Zeit.','Er sagt, dass hat er keine Zeit.'],'„hat“ steht am Ende des Nebensatzes.'),
(S,'Ich lerne Deutsch, weil ich in Deutschland arbeiten möchte.',['Ich lerne Deutsch, weil ich möchte in Deutschland arbeiten.','Ich lerne Deutsch, weil möchte ich in Deutschland arbeiten.'],'Bei Modalverb im Nebensatz steht das Modalverb ganz am Ende: „arbeiten möchte“.'),
(S,'Wenn es regnet, bleibe ich zu Hause.',['Wenn es regnet, ich bleibe zu Hause.','Wenn regnet es, bleibe ich zu Hause.'],'Nebensatz zuerst: Danach beginnt der Hauptsatz sofort mit dem Verb (Position 1 im Satzteil).'),
(S,'Ich frage, ob er heute kommen kann.',['Ich frage, ob er kann heute kommen.','Ich frage, ob kann er heute kommen.'],'Indirekte Ja/Nein-Frage mit „ob“: Verb am Ende.'),
(S,'Obwohl ich müde war, habe ich gearbeitet.',['Obwohl ich war müde, habe ich gearbeitet.','Obwohl ich müde war, ich habe gearbeitet.'],'Nebensatz: „war“ am Ende. Danach beginnt der Hauptsatz mit dem Verb.'),
(S,'Ich rufe an, weil ich einen Termin brauche.',['Ich rufe an, weil ich brauche einen Termin.','Ich rufe an, weil brauche ich einen Termin.'],'„weil“ schickt das Verb ans Ende.'),
(S,'Weißt du, wann der Zug abfährt?',['Weißt du, wann fährt der Zug ab?','Weißt du, wann der Zug fährt ab?'],'Indirekte Frage: Verb am Ende; trennbares Verb bleibt zusammen: „abfährt“.'),
(S,'Sie fragt, wo die Post ist.',['Sie fragt, wo ist die Post.','Sie fragt, wo die ist Post.'],'Nach dem Fragewort steht das Verb am Ende des Nebensatzes.'),
(S,'Ich hoffe, dass Sie mir helfen können.',['Ich hoffe, dass Sie können mir helfen.','Ich hoffe, dass können Sie mir helfen.'],'Im „dass“-Satz steht das Modalverb nach dem Infinitiv am Ende.')])
topic('konn','Konnektoren','weil = Grund (Nebensatz) · denn = Grund (Hauptsatz) · obwohl = Gegensatz · damit = Ziel · deshalb = Folge · aber/sondern = Gegensatz · sodass = Folge.',[
('Ich komme nicht, ___ ich krank bin.','weil',['obwohl','damit'],'Krank sein ist der Grund → „weil“.'),
('Er lernt viel, ___ er die Prüfung besteht.','damit',['weil','obwohl'],'Das Ziel (wozu?) → „damit“.'),
('___ es stark regnete, gingen wir spazieren.','Obwohl',['Weil','Damit'],'Regen ist normalerweise ein Hindernis, wir gingen trotzdem → „Obwohl“.'),
('Ich bin krank, ___ bleibe ich im Bett.','deshalb',['weil','obwohl'],'Folge: „deshalb“, danach steht das Verb direkt (Position 2).'),
('Ich möchte kommen, ___ ich habe keine Zeit.','aber',['weil','dass'],'„aber“ steht auf Position 0 und verbindet zwei Hauptsätze. „weil“ und „dass“ brauchen das Verb am Ende.'),
('Ich möchte nicht Tee, ___ Kaffee.','sondern',['aber','denn'],'Nach einer Verneinung („nicht Tee“) folgt die Alternative mit „sondern“.'),
('Es gab einen Unfall, ___ kommt der Bus später.','deshalb',['obwohl','damit'],'Der Unfall ist die Ursache, das Spätkommen die Folge.'),
('Er spricht so leise, ___ ich ihn nicht verstehe.','sodass',['weil','obwohl'],'„sodass“ nennt die Folge; das Verb steht am Ende.'),
('Ich frage mich, ___ er heute kommt.','ob',['dass','weil'],'Ja/Nein-Frage, die man sich stellt → „ob“.'),
('Er hat gesagt, ___ er morgen nicht arbeitet.','dass',['ob','damit'],'Der Inhalt der Aussage → „dass“.')])
topic('kasus','Artikel: Akkusativ und Dativ','Akkusativ: wen/was? (der → den). Dativ: wem? (der → dem, die → der, das → dem). Nach mit, bei, von, zu, nach, aus: immer Dativ. Nach für, ohne, durch: Akkusativ.',[
('Ich sehe ___ Mann.','den',['dem','der'],'sehen + Akkusativ, maskulin → „den Mann“.'),
('Ich helfe ___ Frau.','der',['die','den'],'helfen + Dativ, feminin → „der Frau“.'),
('Sie schenkt ___ Kind ein Buch.','dem',['das','den'],'Wem? → Dativ, neutral → „dem Kind“.'),
('Ich kaufe ___ Auto.','ein',['einem','einen'],'kaufen + Akkusativ, neutral → „ein Auto“.'),
('Er wohnt bei ___ Eltern.','seinen',['seine','seinem'],'bei + Dativ, Plural → „seinen Eltern“ (Dativ Plural endet auf -n).'),
('Wir fahren mit ___ Bus.','dem',['den','der'],'mit + Dativ, maskulin → „dem Bus“.'),
('Ich habe ___ Hund.','einen',['einem','ein'],'haben + Akkusativ, maskulin → „einen Hund“.'),
('Das Buch gehört ___ Lehrerin.','der',['die','den'],'gehören + Dativ, feminin → „der Lehrerin“.'),
('Ich danke ___ Kollegen.','dem',['den','der'],'danken + Dativ, maskulin → „dem Kollegen“.'),
('Sie kocht für ___ Familie.','die',['der','den'],'für + Akkusativ, feminin → „die Familie“.')])
topic('adj','Adjektivendungen','Nach ein-/eine/ein im Nominativ/Akkusativ: -er/-e/-es (m/f/n; Akk. m: -en). Nach der/die/das und im Dativ: meist -en.',[
('Ich suche eine ___ Wohnung.','günstige',['günstiger','günstigen'],'eine + feminin, Akkusativ → -e.'),
('Er trägt einen ___ Mantel.','warmen',['warmer','warme'],'einen + maskulin, Akkusativ → -en.'),
('Das ist ein ___ Auto.','neues',['neue','neuen'],'ein + neutral, Nominativ → -es.'),
('Wir haben ein ___ Problem.','großes',['große','großem'],'ein + neutral, Akkusativ → -es.'),
('Mit dem ___ Zug fahren wir.','schnellen',['schnelle','schneller'],'Nach Artikel im Dativ → -en.'),
('Die ___ Kinder spielen im Garten.','kleinen',['kleine','kleiner'],'Nach „die“ im Plural → -en.'),
('Ich brauche ___ Brot.','frisches',['frische','frischem'],'Ohne Artikel, neutral, Akkusativ → -es.'),
('Das ist ein Mann mit ___ Haaren.','grauen',['graue','grauer'],'mit + Dativ Plural → -en.'),
('Sie hat eine ___ Stimme.','schöne',['schönen','schönes'],'eine + feminin → -e.'),
('Ich kaufe den ___ Pullover.','roten',['rote','rotes'],'den + maskulin, Akkusativ → -en.')])
topic('prep','Präpositionen mit Verben','Viele Verben haben eine feste Präposition: warten auf, sich freuen auf/über, danken für, sich interessieren für, sich beschweren über, denken an, sprechen über, bitten um.',[
('Ich warte ___ den Bus.','auf',['an','für'],'warten auf + Akkusativ.'),
('Wir freuen uns ___ das Wochenende.','auf',['über','für'],'sich freuen auf = sich auf etwas Zukünftiges freuen.'),
('Ich danke Ihnen ___ Ihre Hilfe.','für',['an','auf'],'danken für + Akkusativ.'),
('Er interessiert sich ___ Musik.','für',['an','über'],'sich interessieren für.'),
('Sie beschwert sich ___ den Lärm.','über',['auf','für'],'sich beschweren über + Akkusativ.'),
('Ich denke oft ___ meine Familie.','an',['über','auf'],'denken an + Akkusativ.'),
('Wir sprechen ___ das Problem.','über',['mit','für'],'sprechen über + Akkusativ.'),
('Ich bitte Sie ___ Ihr Verständnis.','um',['für','auf'],'bitten um + Akkusativ.'),
('Das hängt ___ dem Wetter ab.','von',['auf','an'],'abhängen von + Dativ.'),
('Ich fahre ___ Berlin.','nach',['in','zu'],'Städte und Länder ohne Artikel: nach.')])
topic('perf','Perfekt','haben + Partizip II für die meisten Verben. sein + Partizip II bei Bewegung und Zustandswechsel (fahren, gehen, kommen, bleiben, aufstehen).',[
('Gestern ___ ich Fußball gespielt.','habe',['bin','war'],'spielen → Perfekt mit „haben“.'),
('Er ___ nach Berlin gefahren.','ist',['hat','wird'],'fahren (Bewegung) → „sein“.'),
('Wir ___ lange auf den Bus gewartet.','haben',['sind','waren'],'warten → „haben“.'),
('Sie ___ gestern spät aufgestanden.','ist',['hat','wurde'],'aufstehen (Zustandswechsel) → „sein“.'),
('Ich habe die Tür ___.','geöffnet',['geöffnen','öffnet'],'Partizip II von „öffnen“: geöffnet.'),
('Er hat mir ein Buch ___.','geschenkt',['geschenken','schenkt'],'Partizip II von „schenken“: geschenkt.'),
('Wir sind in Köln ___.','geblieben',['gebleiben','bleibt'],'„bleiben“ ist unregelmäßig: geblieben (mit „sein“).'),
('Hast du schon ___?','gegessen',['geessen','gegesst'],'„essen“ → gegessen (unregelmäßig).'),
('Der Zug ist pünktlich ___.','angekommen',['angekommt','geankommen'],'Trennbar: an-ge-kommen.'),
('Ich habe meinen Schlüssel ___.','verloren',['geverloren','verlieren'],'Verben mit ver- bekommen kein „ge-“: verloren.')])
topic('modal','Modalverben und Präteritum','Die Endung hängt vom Subjekt ab: ich kann/muss/will/darf/soll · du kannst/musst … · er kann · wir/Sie können. Präteritum: konnte, musste, wollte, durfte, sollte.',[
('Er ___ gestern nicht kommen.','konnte',['kann','könnte'],'Vergangenheit → Präteritum „konnte“.'),
('Früher ___ wir in der Schule viel lernen.','mussten',['müssen','musste'],'Früher → Präteritum, „wir“ → mussten.'),
('Ich ___ gern Kaffee.','möchte',['möchtest','möchten'],'ich → möchte.'),
('Du ___ hier nicht rauchen.','darfst',['darf','dürft'],'du → darfst.'),
('Er ___ gut Deutsch sprechen.','kann',['kannst','können'],'er → kann (ohne -t am Stamm, kein -st).'),
('Wir ___ heute früh aufstehen.','müssen',['muss','musst'],'wir → müssen.'),
('Ihr ___ pünktlich sein.','sollt',['soll','sollen'],'ihr → sollt.'),
('Als Kind ___ ich viel spielen.','durfte',['darf','dürfte'],'Rückblick in die Kindheit → Präteritum „durfte“.'),
('Er ___ nicht schwimmen, als er klein war.','konnte',['kann','konnten'],'er → konnte, Vergangenheit.'),
('Ich ___ morgen arbeiten.','muss',['musst','müssen'],'ich → muss.')])
topic('wech','Wo? oder Wohin? (Wechselpräpositionen)','Wo? → Dativ (steht, liegt, hängt). Wohin? → Akkusativ (stelle, lege, hänge, gehe in).',[
('Das Buch liegt auf ___ Tisch.','dem',['den','der'],'Wo? → Dativ, maskulin → „dem Tisch“.'),
('Ich lege das Buch auf ___ Tisch.','den',['dem','der'],'Wohin? → Akkusativ → „den Tisch“.'),
('Wir gehen in ___ Park.','den',['dem','der'],'Wohin? → Akkusativ → „den Park“.'),
('Er steht vor ___ Haus.','dem',['das','den'],'Wo? → Dativ, neutral → „dem Haus“.'),
('Sie hängt das Bild an ___ Wand.','die',['der','den'],'Wohin? → Akkusativ, feminin → „die Wand“.'),
('Das Bild hängt an ___ Wand.','der',['die','den'],'Wo? → Dativ, feminin → „der Wand“.'),
('Der Hund schläft unter ___ Tisch.','dem',['den','der'],'Wo? → Dativ → „dem Tisch“.'),
('Ich stelle die Flasche in ___ Kühlschrank.','den',['dem','der'],'Wohin? → Akkusativ → „den Kühlschrank“.'),
('Wo ist die Katze? – Sie sitzt auf ___ Sofa.','dem',['das','den'],'Wo? → Dativ, neutral → „dem Sofa“.'),
('Wohin gehst du? – Ich gehe in ___ Küche.','die',['der','den'],'Wohin? → Akkusativ, feminin → „die Küche“.')])
topic('pron','Reflexiv- und Personalpronomen','mich/dich/sich/uns = Akkusativ · mir/dir/sich/uns = Dativ · ihn/ihm, sie/ihr, es/ihm. Das Verb entscheidet: Akkusativ oder Dativ.',[
('Ich freue ___ auf den Urlaub.','mich',['mir','sich'],'sich freuen → reflexiv im Akkusativ: „mich“.'),
('Er wäscht ___ die Hände.','sich',['ihn','ihm'],'Mit Körperteil steht das Reflexivpronomen im Dativ: „sich“.'),
('Kannst du ___ bitte helfen?','mir',['mich','ich'],'helfen + Dativ → „mir“.'),
('Wir treffen ___ morgen.','uns',['wir','unser'],'sich treffen → reflexiv „uns“.'),
('Ich rufe ___ später an. (du)','dich',['dir','du'],'anrufen + Akkusativ → „dich“.'),
('Das ist ___ Fahrrad. (ich)','mein',['meine','meinen'],'Fahrrad ist neutral → „mein“ (ohne Endung).'),
('Sie liebt ___ Kinder. (sie)','ihre',['ihr','ihren'],'Kinder = Plural, Akkusativ → „ihre“.'),
('Ich gebe ___ das Buch. (er)','ihm',['ihn','er'],'geben + Dativ → „ihm“.'),
('Ich sehe ___ jeden Tag. (sie, Plural)','sie',['ihnen','ihr'],'sehen + Akkusativ → „sie“.'),
('Er ruft ___ Mutter an. (sein)','seine',['seiner','seinen'],'Mutter ist feminin, Akkusativ → „seine“.')])
topic('zu','Infinitiv mit zu, um … zu, damit','Infinitiv mit „zu“ nach Ausdrücken wie vergessen, anfangen, Lust haben. „um … zu“ = Ziel, wenn das Subjekt gleich bleibt. „damit“ = Ziel mit anderem Subjekt. Trennbare Verben: aufzustehen.',[
(S,'Ich habe vergessen, die Rechnung zu bezahlen.',['Ich habe vergessen, die Rechnung bezahlen zu.','Ich habe vergessen, zu die Rechnung bezahlen.'],'„zu“ steht direkt vor dem Infinitiv am Ende.'),
(S,'Ich lerne Deutsch, um in Deutschland zu arbeiten.',['Ich lerne Deutsch, um in Deutschland arbeiten.','Ich lerne Deutsch, um zu in Deutschland arbeiten.'],'„um … zu“: „zu“ steht vor dem Infinitiv am Satzende.'),
(S,'Er fängt an, Deutsch zu lernen.',['Er fängt an Deutsch lernen zu.','Er fängt an zu Deutsch lernen.'],'„zu“ steht unmittelbar vor „lernen“.'),
(S,'Es ist wichtig, pünktlich zu sein.',['Es ist wichtig, pünktlich sein zu.','Es ist wichtig, zu pünktlich sein.'],'„zu sein“ bleibt zusammen am Ende.'),
(S,'Ich gehe zum Bäcker, um Brot zu kaufen.',['Ich gehe zum Bäcker, damit Brot zu kaufen.','Ich gehe zum Bäcker, um Brot kaufen.'],'Gleiches Subjekt → „um … zu“, nicht „damit“.'),
(S,'Sie hört auf zu rauchen.',['Sie hört auf rauchen.','Sie hört auf zu rauchen zu.'],'aufhören + zu + Infinitiv.'),
('Ich spare Geld, ___ meine Kinder studieren können.','damit',['um','weil'],'Anderes Subjekt (meine Kinder) → „damit“.'),
('Ich versuche, früh ___.','aufzustehen',['aufstehen zu','zu aufstehen'],'Trennbares Verb: „zu“ steht zwischen Präfix und Stamm.'),
('Er hat keine Lust ___ arbeiten.','zu',['um zu','damit'],'Lust haben + „zu“ + Infinitiv.'),
('Ich gehe ins Büro, ___ zu arbeiten.','um',['damit','dass'],'Ziel mit gleichem Subjekt → „um … zu“.')])
topic('hoef','Höfliche Bitten und Konjunktiv II','Höflich fragen: Könnten Sie …? Würden Sie …? Dürfte ich …? Ich hätte gern … Ich möchte … Wenn + Konjunktiv II für Bedingungen.',[
('___ Sie mir bitte helfen?','Könnten',['Konnten','Kannten'],'Höfliche Bitte → Konjunktiv II „Könnten“.'),
('Ich ___ gern einen Termin.','hätte',['habe','hatte'],'„Ich hätte gern …“ ist höflich.'),
('___ Sie bitte das Fenster schließen?','Würden',['Wurden','Werden'],'Höfliche Bitte → „Würden Sie …?“.'),
('Ich ___ gern ein Zimmer buchen.','möchte',['mochte','mag'],'„möchte“ = höflicher Wunsch.'),
('Wenn ich Zeit ___, würde ich kommen.','hätte',['hatte','habe'],'Irreale Bedingung → Konjunktiv II „hätte“.'),
('Ich wäre Ihnen dankbar, ___ Sie mir helfen könnten.','wenn',['ob','weil'],'Bedingung/Wunsch → „wenn“.'),
('Ich ___ gern wissen, wann der Kurs beginnt.','würde',['wurde','werde'],'„würde gern“ ist höflich.'),
('___ ich Sie etwas fragen?','Dürfte',['Durfte','Darfte'],'Sehr höfliche Frage → „Dürfte“.'),
('Hätten Sie ___ Moment Zeit?','einen',['einem','ein'],'Moment ist maskulin, Akkusativ → „einen Moment“.'),
('Ich bitte Sie, ___ zu antworten.','mir',['mich','ich'],'antworten + Dativ → „mir“.')])
out={'topics':[]}
for t in T:
    out['topics'].append({'id':t['id'],'name':t['name'],'tip':t['tip'],'items':[{'id':'g:%s:%d'%(t['id'],i+1),'q':q,'ok':a,'bad':b,'why':w} for i,(q,a,b,w) in enumerate(t['items'])]})
json.dump(out,open('docs/playground/bank-grammatik.json','w'),ensure_ascii=False,separators=(',',':'))
print(len(T),'topics',sum(len(t['items']) for t in T),'items')
