
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

var GrafJS = [];                  // Hovedregister.
var TrafikkRegister = [];         // Datapunkt-register fra server.
var OppdateringsIntervall = 5000; // JSON ms intervall fra server.
var Xstep = 5;

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
	var CurCanvasX = document.getElementById("Grafs").offsetWidth;
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
	GrafJS[GrafJSIndex][4].font = "12px Verdana";
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
		GrafJS[a][2].strokeStyle = "#ccc";
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
		var first_graph_points = true;
		for (let b=0; b<TrafikkRegister[a].length; b++) {
			
			// Sørg over ledig margin i starten av graf.
			if (Xcoord <= 20) {
				Xcoord += GrafJS[a][0];
				continue;
			}
			
			// Tegn undergrafer.
			for (let c=0; c<GrafJS[a][7].length; c++) {
				
				// Første punkt skal starte fra linje.
				if (first_graph_points)
					GrafJS[a][7][c][2] = GrafJS[a][1].height;
				
				// Tegn linjer for INN og UT.
				GrafJS[a][2].beginPath();
				GrafJS[a][2].strokeStyle = GrafJS[a][7][c][1];
				GrafJS[a][2].moveTo(Xcoord, GrafJS[a][7][c][2]);
				GrafJS[a][2].lineTo(Xcoord+GrafJS[a][0], TrafikkRegister[a][b][c+1]);
				GrafJS[a][2].stroke();
				
				// Oppdater lastY for neste runde.
				GrafJS[a][7][c][2] = TrafikkRegister[a][b][c+1];
			}
			first_graph_points = false;
			
			// Tidslinjetekst.
			GrafJS[a][4].fillText(TrafikkRegister[a][b][3], Xcoord+18, 2);
			
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
					GrafJS[a][11].font = "11px Verdana";
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
					GrafJS[a][11].strokeStyle = "#eee";
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
					GrafJS[a][11].fillStyle = "#000";
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
	}
}


//
//  Bruker TrafikkRegister[] som fylles først, til å opprette en graf per tittel.
//  Registrerer deretter 2 undergrafer per tittel igjen for INN- og UT trafikk.
//
function OpprettGrafer() {
	
	var from_top = 0;
	for (var n=0; n<TrafikkRegister.length; n++) {
		
		// Visuell graf.
		document.getElementById('Grafs').innerHTML += ''+
		'<div id="graf_id_'+ n +'" class="graf-container" style="top:'+ from_top +'px">'+
		'	<canvas id="Graf'+ n +'" height="100px" class="graf"></canvas>'+
		'	<canvas id="GrafTimeline'+ n +'" height="18px" class="graf-timeline"></canvas>'+
		'	<div id="HWinfo">'+
		'		<canvas id="GageBox'+ n +'" height="35px"></canvas><br>'+
		'		<span id="GrafText'+ n +'" class="graftext">'+ TrafikkRegister[n][0][0].replace('_reverse','') +'</span>'+
		'	</div>'+
		'</div>';
		
		// Oppdater visuell Y-plassering.
		from_top += 215;
		
		// Registrer graf.
		GrafCreate();
		
		// Registrer undergrafer.
		// GrafLoad(array(array(string Name, string Color, int LastY, int NewY)), int GrafJSIndex)
		GrafLoad(
			[
				["Mbps INN","green",0,0],
				["Mbps UT","blue",0,0]
			], 
			n
		);
	}
	
	// Litt spacing på bunnen.
	document.getElementById('Grafs').innerHTML += ''+
	'<div style="'+
		'position: absolute; '+
		'right: 0px; '+
		'top: '+ (from_top + 30) +'px; '+
		'padding-bottom: 10px; '+
		'font-family: verdana; '+
		'font-size: 11px; '+
		'color: #333;'+
	'">&copy;2024 Nettverksmonitor fra <a href="https://thronic.com" target="_blank" style="text-decoration:none" title="Dag J. V. Nedrelid">ժʝ</a></div>';
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