
//
//  GUI spesielt produsert for Nettverksmonitor.exe
//  Kan brukes som referanse til andre løsninger som har bufrede datasett.
//
//  Denne versjonen av GrafJS henter JSON sett med bufrede datapunkter fra en server.
//  OppdaterGrafData() kjører etter forberedelse av data, GrafEngine() i loop per N intervall.
//  Intervall baseres på JSON mottatt fra server, sammen med dynamisk opprettelse av grafer.
//  Det gjør at man kan hovedsaklig forholde seg til konfigurasjon.ini hos Nettverksmonitor.exe,
//  i forhold til antall enheter og intervall. Server har ansvar for datasett-størrelse.
//


// MØRKT TEMA FARGER
var FARGE_FARTSLINJER = '#666';
var FARGE_FARTSTITLER = '#fff';
var FARGE_GAUGE_BAKGRUNN = '#666';
var FARGE_GAUGE_INN = '#0f0';
var FARGE_GAUGE_UT = '#3cf';
var FARGE_GAUGE_VERDI = '#fff';
var FARGE_TIDSLINJE = '#fff';
var FARGE_MADEBY_TEKST = '#eee';

// LYST TEMA FARGER
/*
var FARGE_FARTSLINJER = '#ccc';
var FARGE_FARTSTITLER = '#000';
var FARGE_GAUGE_BAKGRUNN = '#ccc';
var FARGE_GAUGE_INN = 'green';
var FARGE_GAUGE_UT = 'blue';
var FARGE_GAUGE_VERDI = '#000';
var FARGE_TIDSLINJE = '#000';
var FARGE_MADEBY_TEKST = '#000';
*/

// Globale Systemvariabler.
var GrafJS = [];                  // Hovedregister.
var TrafikkRegister = [];         // Datapunkt-register fra server.
var OppdateringsIntervall = 5000; // JSON ms intervall fra server.
var Xstep = 5;
var TimeLineCounters = [];        // Tellere for tidspunkt avstand.

// Oppretter grafer, stykkvis.
function GrafCreate() {
	GrafJS.push([
		Xstep,		// GrafStepX
		null,null,	// GrafCanvas, GrafCtx (graf itself)
		null,null,	// GrafCanvasTL, GrafCtxTL (timeline)
		[],		// GrafMatrix
		[],		// GrafMatrixTL
		[],		// GrafCollection (cpu, gpu, etc).
		0n,		// LastTimelineRecorded
		null,		// GrafInfoBox
		null,null	// GageCanvas, GageCtx
	]);
}


// Registrerer undergrafer på angitt GrafJS indeks.
function GrafLoad(Grafs,GrafJSIndex) {
	
	// Start Graf engine.
	PrepCanvases(GrafJSIndex);
	GrafJS[GrafJSIndex][7] = Grafs;
	
	// Prep initial Y coords for all inquired graphs.
	for (n=0; n<GrafJS[GrafJSIndex][7].length; n++) {
		GrafJS[GrafJSIndex][7][n][2] = GrafJS[GrafJSIndex][1].height;
		GrafJS[GrafJSIndex][7][n][3] = GrafJS[GrafJSIndex][1].height;
	}
}


// Tar seg av udaterte canvas detaljer samt dynamisk resizing av nettleservindu.
function PrepCanvases(GrafJSIndex) {
	
	// Get the canvases.
	GrafJS[GrafJSIndex][1] = document.getElementById("Graf"+GrafJSIndex);
	GrafJS[GrafJSIndex][3] = document.getElementById("GrafTimeline"+GrafJSIndex);
	GrafJS[GrafJSIndex][10] = document.getElementById("GageBox"+GrafJSIndex);
	
	// Canvas properties and contexts.
	var CurCanvasX = document.getElementById("Grafs").offsetWidth-15; // -15 hindrer h-scrolling.
	GrafJS[GrafJSIndex][1].width = CurCanvasX;
	GrafJS[GrafJSIndex][3].width = CurCanvasX;
	GrafJS[GrafJSIndex][10].width = CurCanvasX;
	GrafJS[GrafJSIndex][2] = GrafJS[GrafJSIndex][1].getContext("2d");
	GrafJS[GrafJSIndex][4] = GrafJS[GrafJSIndex][3].getContext("2d");
	GrafJS[GrafJSIndex][11] = GrafJS[GrafJSIndex][10].getContext("2d");
	GrafJS[GrafJSIndex][2].clearRect(-10,-10,GrafJS[GrafJSIndex][1].width+20,GrafJS[GrafJSIndex][1].height+20);
	GrafJS[GrafJSIndex][4].clearRect(-10,-10,GrafJS[GrafJSIndex][1].width+20,GrafJS[GrafJSIndex][1].height+20);
	GrafJS[GrafJSIndex][11].clearRect(-10,-10,GrafJS[GrafJSIndex][10].width+20,GrafJS[GrafJSIndex][10].height+20);
	
	// Default styling.
	GrafJS[GrafJSIndex][2].strokeStyle = "blue";
	GrafJS[GrafJSIndex][2].lineWidth = 2;
	GrafJS[GrafJSIndex][2].lineJoin = "round";
	GrafJS[GrafJSIndex][2].lineCap = "round";
	GrafJS[GrafJSIndex][2].translate(0.5,0.5);
	GrafJS[GrafJSIndex][2].font = "11px Verdana";
	GrafJS[GrafJSIndex][2].textBaseline = "middle";
	GrafJS[GrafJSIndex][4].font = "13px Arial";
	GrafJS[GrafJSIndex][4].textAlign = "end";
	GrafJS[GrafJSIndex][4].textBaseline = "top";
}


// Tar seg av visning og graf-historikk.
function GrafEngine() {
	
	// Hent siste grafdata.
	HentJSONFraServer();
	//console.log(TrafikkRegister);
	
	// Loop gjennom alle hovedgrafer/titler.
	for (let a=0; a<TrafikkRegister.length; a++) {
		
		// Ta høyde for evt. resizing.
		PrepCanvases(a);
		
		// Lokale variabler.
		var n,n2,newX;
		var TimelineTime;
		var GrafColor = "";
		var Xcoord = GrafJS[a][1].width - (TrafikkRegister[a].length * Xstep);
		
		// Horisontale graf-visningsverdier.
		GrafJS[a][2].beginPath();
		GrafJS[a][2].strokeStyle = FARGE_FARTSLINJER;
		GrafJS[a][2].fillStyle = FARGE_FARTSTITLER;
		GrafJS[a][2].lineWidth = 1;
		
		// 90 Mbps.
		GrafJS[a][2].moveTo(20,0);
		GrafJS[a][2].lineTo(20,GrafJS[a][1].height);
		GrafJS[a][2].moveTo(20,10);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,10);
		GrafJS[a][2].fillText("90",2,10);
		
		// 80 Mbps.
		GrafJS[a][2].moveTo(20,20);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,20);
		GrafJS[a][2].fillText("80",2,20);
		
		// 70 Mbps.
		GrafJS[a][2].moveTo(20,30);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,30);
		GrafJS[a][2].fillText("70",2,30);
		
		// 60 Mbps.
		GrafJS[a][2].moveTo(20,40);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,40);
		GrafJS[a][2].fillText("60",2,40);
		
		// 50 Mbps.
		GrafJS[a][2].moveTo(20,50);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,50);
		GrafJS[a][2].fillText("50",2,50);
		
		// 40 Mbps.
		GrafJS[a][2].moveTo(20,60);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,60);
		GrafJS[a][2].fillText("40",2,60);
		
		// 30 Mbps.
		GrafJS[a][2].moveTo(20,70);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,70);
		GrafJS[a][2].fillText("30",2,70);
		
		// 20 Mbps.
		GrafJS[a][2].moveTo(20,80);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,80);
		GrafJS[a][2].fillText("20",2,80);
		
		// 10 Mbps.
		GrafJS[a][2].moveTo(20,90);
		GrafJS[a][2].lineTo(GrafJS[a][1].width,90);
		GrafJS[a][2].fillText("10",2,90);
		GrafJS[a][2].stroke();
		
		// Set back line thickness for graphs.
		GrafJS[a][2].lineWidth = 2;
	
		// Tegn grafpunkter per tittel fra oppdatert buffer.
		var first_graph_update_round = true;
		for (let b=0; b<TrafikkRegister[a].length; b++) {
			
			// Sørg over ledig margin i starten av graf.
			var LeftMargin = 20;
			if (Xcoord <= LeftMargin) {
				Xcoord += GrafJS[a][0];
				continue;
			}
			
			// Tegn undergrafer.
			for (let c=0; c<GrafJS[a][7].length; c++) {
				
				// Første punkt skal starte fra neste NewY.
				if (first_graph_update_round) {
					GrafJS[a][7][c][2] = TrafikkRegister[a][b][c+1];
					//GrafJS[a][7][c][2] = GrafJS[a][1].height;
				}
				
				// Tegn linjer for INN og UT.
				GrafJS[a][2].beginPath();
				GrafJS[a][2].strokeStyle = GrafJS[a][7][c][1];
				GrafJS[a][2].moveTo(Xcoord, GrafJS[a][7][c][2]);
				GrafJS[a][2].lineTo(Xcoord+GrafJS[a][0], TrafikkRegister[a][b][c+1]);
				GrafJS[a][2].stroke();
				
				// Oppdater lastY for neste runde.
				GrafJS[a][7][c][2] = TrafikkRegister[a][b][c+1];
				
				// Oppdater mouseover label, trenger kun gjøre det 1 av INN/UT rundene.
				// En hard grense er satt på 1000 bufrede datapunkter for ytelsens skyld.
				if (c==0 && b < 1000) {
					var tl_label = document.getElementById('tl_label_'+ a +'-'+ b);
					tl_label.innerHTML = TrafikkRegister[a][b][3];
					tl_label.style.top = GrafJS[a][1].height +'px';
					tl_label.style.left = Xcoord +'px';
					
					// Ikke gå utenfor synlig område.
					// 50 = ca bredden per label.
					if ((Xcoord + 50) >= GrafJS[a][1].width)
						tl_label.style.left = GrafJS[a][1].width - 50 +'px';
				}
			}
			first_graph_update_round = false;
			
			// Tidslinjetekst: Sørg for litt mellomrom.
			// 5000ms intervaller og 1,5 minutters mellomrom 
            // = (1,5*60=90)/5 = 18 ganger det skippes.
			if (TimeLineCounters[a] > 0 && TimeLineCounters[a] < 18) {
				TimeLineCounters[a] += 1;
			} else {
				GrafJS[a][4].fillStyle = FARGE_TIDSLINJE;
				GrafJS[a][4].fillText(TrafikkRegister[a][b][3], Xcoord+28, 2);
				TimeLineCounters[a] = 1;
			}
			
			// Oppdatering X bevegelse.
			Xcoord += GrafJS[a][0];
			
			// Oppdater gage hvis det er siste punkt for tittel.
			if (b == (TrafikkRegister[a].length-1)) {
				
				// Per undergraf.
				let GageXPos = 30;
				for (let c=0; c<GrafJS[a][7].length; c++) {
				
					let GageValuePos = 0;
					let GageColor = ((100 - TrafikkRegister[a][b][c+1]) >= 50 ? "red":"green");
					let PercentStepValue = Math.PI/100;
					let PercentStep = TrafikkRegister[a][b][c+1];
					GrafJS[a][11].font = "11px Arial";
					GrafJS[a][11].lineWidth = 5;
					
					// Percent handling.
					var GageVal = (100-PercentStep);
					if (GageVal < 10)
						GageValuePos = 3;
					else if (GageVal < 100)
						GageValuePos = 6;
					else if (GageVal == 100)
						GageValuePos = 10;
					
					//BGcolor.
					GrafJS[a][11].beginPath();
					GrafJS[a][11].arc(GageXPos,20,15,Math.PI,(Math.PI*2));
					GrafJS[a][11].strokeStyle = FARGE_GAUGE_BAKGRUNN;
					GrafJS[a][11].stroke();
					// Front color.
					GrafJS[a][11].beginPath();
					GrafJS[a][11].arc(GageXPos,20,15,Math.PI,(Math.PI*2)-PercentStepValue*PercentStep);
					GrafJS[a][11].strokeStyle = GageColor;
					GrafJS[a][11].stroke();
					// Name.
					GrafJS[a][11].beginPath();
					GrafJS[a][11].fillStyle = GrafJS[a][7][c][1];
					GrafJS[a][11].fillText(GrafJS[a][7][c][0],GageXPos-(GrafJS[a][7][c][0].length*3),30);
					GrafJS[a][11].stroke();
					// Value.
					GrafJS[a][11].beginPath();
					GrafJS[a][11].font = "10px Verdana";
					GrafJS[a][11].fillStyle = FARGE_GAUGE_VERDI;
					GrafJS[a][11].fillText(GageVal.toFixed(), GageXPos-GageValuePos, 20);
					GrafJS[a][11].stroke();
					
					// GageXPos
					GageXPos += 80;
				}
				
				// Vis litt informasjonstekst om nøyaktig data rate.
				let InnBytesMBs = (100 - TrafikkRegister[a][b][1]) / 8;
				let UtBytesMBs = (100 - TrafikkRegister[a][b][2]) / 8;
				document.getElementById('GrafText'+a).innerHTML = '<b>'+ TrafikkRegister[a][b][0].replace('_reverse','') +'</b>'+
				' <em>('+
				(InnBytesMBs==0?0:InnBytesMBs.toFixed(2)) +' / '+
				(UtBytesMBs==0?0:UtBytesMBs.toFixed(2)) +' MBps)'+
				'</em>';
			}
		}
	}
	
	// Sorter grafer etter aktivitetsnivå.
	SorterGraferEtterTrafikk();
	
	// Kjør regelmessig, i takt med serverens oppdateringsrutine.
	setTimeout(GrafEngine, OppdateringsIntervall);
}


//
//  Henter en JSON samling med bufret trafikk fra webserver delen.
//
function HentJSONFraServer() {
	
	// Hent JSON fra endpoint på server.
	//var Trafikk = JSON.parse(TrafikkJSON);
	var Trafikk = '';
	var xmlHttp = new XMLHttpRequest();
	var feilboks = document.getElementById('XHR_feilmelding');
	var JSONfeil = false;
	xmlHttp.open('GET','/GetTrafikkBufferJSON',false);
	xmlHttp.onreadystatechange=function() {
		if(xmlHttp.readyState==4) {
			if (xmlHttp.status == 200) {
				feilboks.style.display = 'none';
				try {
					Trafikk = JSON.parse(xmlHttp.responseText);
					JSONfeil = false;
				} catch (err) {
					feilboks.innerHTML = 'En feil oppstod under tolking av JSON fra server.';
					feilboks.style.display = 'block';
					JSONfeil = true;
				}
			} else {
				feilboks.innerHTML = 'XHR returnerte ikke 200 OK.';
				feilboks.style.display = 'block';
				JSONfeil = true;
			}
		}
	}
	
	// Send, og ta høyde for serverbrudd.
	try {
		xmlHttp.send(null);
	} catch (err) {
		feilboks.innerHTML = 'En feil oppstod under XHR.send(). Er monitoren nede?';
		feilboks.style.display = 'block';
		return;
	}
	
	// Vent til JSON ordner seg, etter evt. serverbrudd.
	if (JSONfeil)
		return;
	
	// Nullstill trafikkregister før oppdatering.
	TrafikkRegister = [];
	
	// Nullstill tidslinjeregister før oppdatering.
	TimeLineCounters = [];
	
	// Tolk JSON og hent grafpunkter.
	for (let a=0; a<Trafikk.Samling.length; a++) {
		
		let keys = Object.keys(Trafikk.Samling[a]);
		let grafpunkter_per_tittel = [];
		
		// Loop grafpunkter per tittel.
		for (let b=0; b<Trafikk.Samling[a][keys[0]].length; b++) {
	
			// Registrer data i en enhet, som deretter blir registrert i TrafikkRegister[].
			// Array = [TITTEL, INN-Y-POSISJON, UT-Y-POSISJON, TIDSLINJETEKST]
			let grafpunkt = [];
			grafpunkt.push(keys[0]);
			
			// Ta høyde for _reverse tittel i konfigurasjonsfilen.
			// Svitsjer etc. som sender UT når det MOTTAS på LAN f.eks.
			if (keys[0].includes('_reverse')) {
				grafpunkt.push(Trafikk.Samling[a][keys[0]][b][2]);  // INN-Y-POSISJON.
				grafpunkt.push(Trafikk.Samling[a][keys[0]][b][1]);  // UT-Y-POSISJON.
			} else {
				grafpunkt.push(Trafikk.Samling[a][keys[0]][b][1]);  // INN-Y-POSISJON.
				grafpunkt.push(Trafikk.Samling[a][keys[0]][b][2]);  // UT-Y-POSISJON.
			}
			
			// Resten, og registrer punktet.
			grafpunkt.push(Trafikk.Samling[a][keys[0]][b][3]);  // TIDSLINJETEKST.
			grafpunkter_per_tittel.push(grafpunkt);
		}
		
		// Registrer ny grafpunktliste for tittel.
		TrafikkRegister.push(grafpunkter_per_tittel);
		
		// Registrer en ny teller for tidslinje for tittel.
		TimeLineCounters.push(0);
	}
}


//
// Hjelpefunksjon for mouseover/out på timeline labels.
//
function tl_label_hover(id,show) {
	box = document.getElementById(id);
	if (show)
		box.style.opacity = '0.9';
	else
		box.style.opacity = '0';
}


//
//  Bruker TrafikkRegister[] som fylles først, til å opprette en graf per tittel.
//  Registrerer deretter 2 undergrafer per tittel igjen for INN- og UT trafikk.
//
function OpprettGrafer() {
	
	var from_top = 0;
	for (var n=0; n<TrafikkRegister.length; n++) {
		
		// Beholdere for mouseover tidspunkter på graflinjer.
		// Standard bufrede datasett antall er 1000.
		var timeline_stamp_labels = '';
		for (var a=0; a<1000; a++) {
			timeline_stamp_labels += '<span class="tl_label" id="tl_label_'+n+'-'+a+'" '+
			                         'onmouseover="tl_label_hover(\'tl_label_'+n+'-'+a+'\',true)" '+
									 'onmouseout="tl_label_hover(\'tl_label_'+n+'-'+a+'\',false)"'+
			                         '></span>';
		}
		
		// Visuell graf.
		document.getElementById('Grafs').innerHTML += ''+
		'<div id="graf_id_'+ n +'" class="graf-container" style="top:'+ from_top +'px">'+
		'	<canvas id="Graf'+ n +'" height="100px" class="graf"></canvas>'+
		'	<canvas id="GrafTimeline'+ n +'" height="18px" class="graf-timeline"></canvas>'+
		'	<div id="HWinfo">'+
		'		<canvas id="GageBox'+ n +'" height="35px"></canvas><br>'+
		'		<span id="GrafText'+ n +'" class="graftext">'+ TrafikkRegister[n][0][0].replace('_reverse','') +'</span>'+
		'	</div>'+timeline_stamp_labels+
		'</div>';
		
		// Oppdater visuell Y-plassering.
		from_top += 215;
		
		// Registrer graf.
		GrafCreate();
		
		// Registrer undergrafer.
		// GrafLoad(array(array(string Name, string Color, int LastY, int NewY)), int GrafJSIndex)
		GrafLoad(
			[
				["Mbps INN",FARGE_GAUGE_INN,0,0],
				["Mbps UT",FARGE_GAUGE_UT,0,0]
			], 
			n
		);
	}
	
	// Litt spacing på bunnen.
	document.getElementById('Grafs').innerHTML += ''+
	'<div style="'+
		'position: absolute; '+
		'right: 10px; '+
		'top: '+ (from_top + 30) +'px; '+
		'padding-bottom: 10px; '+
		'font-family: verdana; '+
		'font-size: 11px; '+
		'color: '+ FARGE_MADEBY_TEKST +';'+
	'">&copy;2024 Nettverksmonitor fra <a href="https://thronic.com" target="_blank" style="text-decoration:none; color:'+ FARGE_MADEBY_TEKST +'" title="Dag J. V. Nedrelid">ժʝ</a></div>';
}


//
// Sorteringsfunksjon for visuell fremstilling av grafer etter aktivitetsnivå.
//
function SorterGraferEtterTrafikk() {

	// Hent siste sorteringsverdier (siste grafverdi i GrafMatrix).
	// Hent de 2 siste punktene per graf, for INN/UT kombinert.
	var TrafikkSortRegister = [];
	for (let a=0; a<TrafikkRegister.length; a++) 
		TrafikkSortRegister.push(
			[
				a, 
				GrafJS[a][7][0][2] + 
				GrafJS[a][7][1][2]
			]
		);

	// Sorter registeret.
	// Stigende blir riktig pga Y 100 = nederst og 0 øverst.
	TrafikkSortRegister.sort(
		function(a,b) {
			return (a[1] - b[1]);
		}
	);
	
	// DEBUG
	//console.log(TrafikkSortRegister);

	// Juster graf-posisjoner etter rekkefølge på trafikkregister.
	var from_top = 215;
	
	// Sorteres etter aktivitetsnivå.
	// Blir oppdatert i OppdaterGrafData().
	for (var trN = 0; trN < TrafikkSortRegister.length; trN++) {
	
		// Hopp over WAN/første graf som skal være låst på topp.
		if (TrafikkSortRegister[trN][0] == 0)
			continue;
		
		// Sett respektiv topp-posisjon.
		document.getElementById('graf_id_'+ TrafikkSortRegister[trN][0]).style.top = from_top +'px';
		from_top += 215;
	}
}