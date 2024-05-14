#pragma once
#include <net-snmp/net-snmp-config.h>
#include <net-snmp/net-snmp-includes.h>
#include <mutex>
#include <iomanip>

//
// Intervall for SNMP oppdatering i sekunder.
//
int SNMP_update_interval = 5;

//
// Lagre enkelte ting som hentes i konfigurasjon.ini globalt 
// for lett tilgang fra andre klasser som starter i egne tråder.
//
struct Konfigurasjon {
	// Klargjøres til WebUI server under innlasting av konfigurasjon.ini
	// Standard er 8888 hvis ingen annen info blir funnet.
	std::string SERVER_PORT = "8888";

	// Størrelse på hvor mange datasett som skal mellomlagres og sendes via JSON til ui.
	// Standard er kun 100 hvis ingen annen info blir funnet via LastKonfigurasjon().
	int TrafikkBufferAntall = 100;
} Konfig;

// Globalt flagg for å stoppe oppdateringstråd.
bool global_SNMP_oppdateringer_stoppsignal = false;

// Klasse for både SNMP oppdateringer og lesing av konfigurasjonsfil,
// konfigurasjonsfilen har hovedsaklig i oppgave å levere enhetsinfo.
class djSNMP
{
	// Struktur for ett stykk trafikkdata,
	// for lagring i enheters trafikkbuffer.
	struct TrafikkBufferEnhet {
		float INN = 0;
		float UT = 0;
		time_t TIDSPUNKT = 0;
	};

	// Struktur for trafikkenheter.
	struct Enhet {
		// Konfigurasjonsfil
		std::string IP = "";
		std::string interfaceport = "";
		std::string portalias = "";
		std::string tittel = "";
		std::string Tidslinje = "";
		std::vector<TrafikkBufferEnhet> trafikkbuffer;

		// OID
		oid oid_objekt_in[MAX_OID_LEN];
		oid oid_objekt_out[MAX_OID_LEN];
		size_t oid_lengde_in = MAX_OID_LEN;
		size_t oid_lengde_out = MAX_OID_LEN;

		// Trafikkdata, brukes til å regne differanse,
		// og deretter lagre i trafikkbuffer ovenfor.
		unsigned long long ForrigeInnData = 0;
		unsigned long long ForrigeUtData = 0;
		unsigned long long NyInnData = 0;
		unsigned long long NyUtData = 0;
	};

	public:
	// Liste som skal holde trafikkenheter.
	std::vector<Enhet> trafikkenheter;

	// Lås ved manuell oppdatering av trafikkenheter.
	std::mutex ConfigLock;
	
	djSNMP()
	{
		// Lokalitet
		setlocale(LC_ALL,"en_US.UTF-8");

		// Initiell innlasting av konfigurasjonsfil.
		this->LastKonfigurasjon();
	}

	// Oppdateringsfunskjon for Inn/Ut data.
	void OppdaterInnUtData()
	{
		// Kun oppdater hvis konfigurasjonsfil ikke er under oppdatering.
		//std::lock_guard<std::mutex> lock(this->ConfigLock);
		ConfigLock.lock();

		// Hent alle verter som skal kobles til.
		std::vector<std::string> IPer;
		for (int a=0; a<trafikkenheter.size(); a++) {

			// Sjekk om IP allerede er lagt til.
			bool lagt_til = false;
			for (int b=0; b<IPer.size(); b++) {
				if (IPer.at(b) == trafikkenheter.at(a).IP)
					lagt_til = true;
			}

			if (!lagt_til)
				IPer.push_back(trafikkenheter.at(a).IP);
		}

		// Utfør en kobling for alle OID per IP.
		for (int a=0; a<IPer.size(); a++) {

			// Net-SNMP variabler.
			snmp_session session, *ss;
			snmp_pdu *pdu, *response;
			variable_list *vars;
			int status = STAT_ERROR;

			// Stien til mibs.
			char mibs_path_buf[MAX_PATH];
			GetModuleFileNameA(0, mibs_path_buf, MAX_PATH);
			std::string mibs_full_sti(mibs_path_buf);
			size_t mibs_sti_cutoff = mibs_full_sti.find_last_of("\\");
			std::string mibs_mappe_sti = mibs_full_sti.substr(0, mibs_sti_cutoff) + "\\mibs";

			// Sett stien til mibs.
			netsnmp_ds_set_string(
				NETSNMP_DS_LIBRARY_ID, 
				NETSNMP_DS_LIB_MIBDIRS, 
				mibs_mappe_sti.c_str()
			);

			// Initialiser Net-SNMP bibliotek.
			init_snmp("Nettverksmonitor");

			// Initialiser session.
			snmp_sess_init(&session);
			session.peername = _strdup(IPer.at(a).c_str());
			session.version = SNMP_VERSION_2c;
			session.community = (u_char*)_strdup("public");
			session.community_len = strlen("public");

			// Åpne session.
			ss = snmp_open(&session);
			if (!ss) {
				snmp_sess_perror("snmp_open", &session);
				GetError("snmp_open");
				free(session.peername); // _strdup
				free(session.community); // _strdup
				exit(1);
			}

			// Forbered OIDer for både inn og ut trafikk i singulære kall.
			// Net-SNMP har en UDP pakkegrense på 128 OID som burde holde.
			for (int b=0; b<trafikkenheter.size(); b++) {
				if (trafikkenheter.at(b).IP != IPer.at(a)) 
					continue;
				
				std::string in = "ifHCInOctets.";
				std::string out = "ifHCOutOctets.";
				in += trafikkenheter.at(b).interfaceport;
				out += trafikkenheter.at(b).interfaceport;

				if (
					!get_node(in.c_str(), trafikkenheter.at(b).oid_objekt_in, &trafikkenheter.at(b).oid_lengde_in) ||
					!get_node(out.c_str(), trafikkenheter.at(b).oid_objekt_out, &trafikkenheter.at(b).oid_lengde_out)
				) {
					snmp_perror(trafikkenheter.at(b).tittel.c_str());
					GetError("Feil ved forberedelse av OIDer.");
					exit(1);
				}
			}
			
			//
			//  Forbered PDU data.
			//  SNMP_MSG_GET for eksakte unike OID, som f.eks. ifDescr.1, ifDescr.2 osv.
			//  SNMP_MSG_GETBULK for en uspesifikert samling opp til pdu->max_repetitions.
			//  Bruk da f.eks. ifDescr for alle, eller ifDescr.FRAOGMED til ^.
			//
			pdu = snmp_pdu_create(SNMP_MSG_GET);
			pdu->non_repeaters = 0;
			pdu->max_repetitions = 30;

			for (int b=0; b<trafikkenheter.size(); b++) {
				if (trafikkenheter.at(b).IP != IPer.at(a)) 
					continue;
			
				// Legg til OID til PDU (ting som skal spørres hos SNMP agent).
				snmp_add_null_var(
					pdu,
					trafikkenheter.at(b).oid_objekt_in,
					trafikkenheter.at(b).oid_lengde_in
				);
				snmp_add_null_var(
					pdu,
					trafikkenheter.at(b).oid_objekt_out,
					trafikkenheter.at(b).oid_lengde_out
				);
			}

			// Send forespørsel.
			status = snmp_synch_response(ss, pdu, &response);
			if (status != STAT_SUCCESS || response->errstat != SNMP_ERR_NOERROR) {
				std::cerr << u8"Feil ved forespørsel:\n";
				if (status == STAT_SUCCESS)
					std::cerr << "Pakkefeil: " << snmp_errstring(response->errstat) << "\n";
				else if (status == STAT_TIMEOUT)
					std::cerr << "Timeout fra: " << session.peername << "\n";
				else
					snmp_sess_perror("snmp_synch_response", ss);

				// Vis beskjed i tilfelle programmet kjører skjult.
				GetError("snmp_synch_response");
				free(session.peername); // _strdup
				free(session.community); // _strdup
				if (response)
					snmp_free_pdu(response);
				//SOCK_CLEANUP;
				exit(1);
			}

			// Håndter respons.
			/* Strenger ... Lar stå for referanse.
			unsigned char buf[4096] = {0};
			for (vars = response->variables; vars; vars = vars->next_variable) {
				print_variable(vars->name, vars->name_length, vars);

				if (vars->type == ASN_OCTET_STR) {
					memcpy(buf, vars->val.string, vars->val_len);
					buf[vars->val_len] = '\0';
					std::cout << "Verdi hentet: " << buf << "\n\n";
					memset(buf, 0, 4096);
				}
			} */


			// Kun interessert i Counter64.
			for (vars = response->variables; vars; vars = vars->next_variable) {
				// For debugging, viser hele strenger og respektive verdier.
				// f.eks. IF-MIB::ifHCInOctets.3 = Counter64: 3129529011771
				//print_variable(vars->name, vars->name_length, vars);

				if (vars->type != ASN_COUNTER64)
					continue;

				// Oppdater respektiv trafikkenhet.
				for (int b=0; b<trafikkenheter.size(); b++) {
					if (trafikkenheter.at(b).IP != IPer.at(a)) 
						continue;

					// Sjekk inndata.
					if (snmp_oid_compare(
							trafikkenheter.at(b).oid_objekt_in, 
							trafikkenheter.at(b).oid_lengde_in, 
							vars->name, 
							vars->name_length
					) == 0) {
						counter64 counter_raw = *(vars->val.counter64);
						uint64_t counter_64 = counter_raw.low;
						counter_64 |= (uint64_t)counter_raw.high << 32;
						trafikkenheter.at(b).NyInnData = counter_64;
						//std::wcout << L"Inndata." << trafikkenheter.at(b).interfaceport << L" = " << std::to_wstring(trafikkenheter.at(b).InnData) << L"\n";
						break;
					}

					// Sjekk utdata.
					if (snmp_oid_compare(
							trafikkenheter.at(b).oid_objekt_out, 
							trafikkenheter.at(b).oid_lengde_out, 
							vars->name, 
							vars->name_length
					) == 0) {
						counter64 counter_raw = *(vars->val.counter64);
						uint64_t counter_64 = counter_raw.low;
						counter_64 |= (uint64_t)counter_raw.high << 32;
						trafikkenheter.at(b).NyUtData = counter_64;
						//std::wcout << L"UtData." << trafikkenheter.at(b).interfaceport << L" = " << std::to_wstring(trafikkenheter.at(b).UtData) << L"\n";
						break;
					}
				}
			}

			// Rydd opp.
			free(session.peername); // _strdup
			free(session.community); // _strdup
			if (response)
				snmp_free_pdu(response);
			snmp_close(ss);
		}

		//
		// Regn ut nye datapunkter i trafikkbuffer per enhet.
		//
		for (int a=0; a<trafikkenheter.size(); a++) {
			TrafikkBufferEnhet tbe;
			
			// Inndata Mbps.
			if (trafikkenheter.at(a).ForrigeInnData == 0) {
				trafikkenheter.at(a).ForrigeInnData = trafikkenheter.at(a).NyInnData;

			} else if (trafikkenheter.at(a).NyInnData > 0) {
				unsigned long long inndiff = trafikkenheter.at(a).NyInnData - trafikkenheter.at(a).ForrigeInnData;
				tbe.INN = ((((float)inndiff / 1024.0f) / 1024.0f) * 8.0f) / SNMP_update_interval;
				trafikkenheter.at(a).ForrigeInnData = trafikkenheter.at(a).NyInnData;

				// Pass på freaky tall.
				if (tbe.INN > 100.f)
					tbe.INN = 100.f;
				else if (tbe.INN < 0.0f)
					tbe.INN = 0.0f;
			}

			// Utdata Mbps.
			if (trafikkenheter.at(a).ForrigeUtData == 0) {
				trafikkenheter.at(a).ForrigeUtData = trafikkenheter.at(a).NyUtData;

			} else if (trafikkenheter.at(a).NyUtData > 0) {
				unsigned long long utdiff = trafikkenheter.at(a).NyUtData - trafikkenheter.at(a).ForrigeUtData;
				tbe.UT = ((((float)utdiff / 1024.0f) / 1024.0f) * 8.0f) / SNMP_update_interval;
				trafikkenheter.at(a).ForrigeUtData = trafikkenheter.at(a).NyUtData;

				// DEBUG (Sjekk råbytes og Mbps i konsoll for riktighet).
				//std::cout << trafikkenheter.at(a).tittel << "\n"
				//          << "utdiff: " << std::to_string(utdiff) << "\n"
				//          << "tbe.UT: " << std::to_string(tbe.UT) << "\n\n";

				// Pass på freaky tall.
				if (tbe.UT > 100.f)
					tbe.UT = 100.f;
				else if (tbe.UT < 0.0f)
					tbe.UT = 0.0f;
			}
			
			// Registrer punkt i enhet for bufferhistorikk.
			tbe.TIDSPUNKT = time(nullptr);
			trafikkenheter.at(a).trafikkbuffer.push_back(tbe);

			// Pass på bufferstørrelse. Tilpass etter web UI visning.
			// Ikke vits å ha mer roterende i minnet enn nødvendig.
			if (trafikkenheter.at(a).trafikkbuffer.size() > Konfig.TrafikkBufferAntall)
				trafikkenheter.at(a).trafikkbuffer.erase(trafikkenheter.at(a).trafikkbuffer.begin());
		}

		ConfigLock.unlock();
	}

	//
	// Returnerer f.eks. 17:38
	//
	std::string TidslinjeTekst(time_t ts)
	{
		tm tid;
		localtime_s(&tid, &ts);
		std::string datotid;

		// Tid.
		datotid.append( ((tid.tm_hour) < 10 ? "0" + std::to_string(tid.tm_hour) : std::to_string(tid.tm_hour) ) + ":");
		datotid.append( ((tid.tm_min) < 10 ? "0" + std::to_string(tid.tm_min) : std::to_string(tid.tm_min) ));

		return datotid;
	}

	// Funksjon for JSON output til web UI.
	std::string GetTrafikkBufferJSON()
	{
		// Forhindre indeks-basert bruk av trafikkenheter vektoren mens den blir oppdatert i OppdaterInnUtData().
		ConfigLock.lock();

		std::string JSONBuffer = "{\"Samling\":\n\t[\n";
		for (size_t a=0; a<trafikkenheter.size(); a++) {
			
			// Sett et initielt tidslinjepunkt.
			time_t forrige_tidspunkt = 0;
			
			// Begynn på JSON output.
			JSONBuffer += "\t\t{\""+ trafikkenheter.at(a).tittel +"\":";
			
			// Mbps INN og UT i formatet:
			// [X-POSISJON, INN-Y-POSISJON, UT-Y-POSISJON, "TIDSLINJETEKST"]
			JSONBuffer += "[";
			for (size_t b=0; b<trafikkenheter.at(a).trafikkbuffer.size(); b++) {
				JSONBuffer += "["+ 
					std::to_string(b) +","+ 
					std::to_string(100.0f - trafikkenheter.at(a).trafikkbuffer.at(b).INN) +","+
					std::to_string(100.0f - trafikkenheter.at(a).trafikkbuffer.at(b).UT) +",";

				// Tidslinjetekst.
				if ((trafikkenheter.at(a).trafikkbuffer.at(b).TIDSPUNKT - forrige_tidspunkt) >= 120 || forrige_tidspunkt == 0) {
					JSONBuffer += "\""+ TidslinjeTekst(trafikkenheter.at(a).trafikkbuffer.at(b).TIDSPUNKT) +"\"";
					forrige_tidspunkt = trafikkenheter.at(a).trafikkbuffer.at(b).TIDSPUNKT;
				} else {
					JSONBuffer += "\"\"";
				}

				JSONBuffer += "],";
			}
			JSONBuffer.pop_back(); // Fjern siste komma.
			JSONBuffer += "]},\n";
		}
		ConfigLock.unlock();

		// Fjern avsluttende komma og legg på avsluttende JSON format.
		JSONBuffer.pop_back();
		JSONBuffer.pop_back();
		JSONBuffer += "\n\t]\n}";

		// DEBUG
		return JSONBuffer;
	}

	void OppdaterInnUtDataRegelmessig()
	{
		std::cout << "Starter oppdateringsmotor.\n";

		while(1) {
			this->OppdaterInnUtData();
			Sleep(SNMP_update_interval * 1000);

			if (global_SNMP_oppdateringer_stoppsignal) {
				std::cout << "SNMP Oppdateringer stoppet OK.\n";
				break;
			}

			// Sørg for å overkjøre hva enn lokalitet Net-SNMP setter regelmessig.
			setlocale(LC_ALL,"en_US.UTF-8");

			// DEBUG
			//std::cout << this->GetTrafikkBufferJSON();

			// Vis bufferstørrelse for fremgang i konsollen.
			std::cout << "\n" << DatotidFull() << ": Buffrede grafpunkter: " << std::to_string(trafikkenheter.at(0).trafikkbuffer.size());
		}
	}

	// Innlastingsfunksjon for konfigurasjonsfil.
	void LastKonfigurasjon()
	{
		// Noe i SNMP overkjører stadig lokalitet.
		setlocale(LC_ALL,"en_US.UTF-8");
		std::cout << "Laster konfigurasjon.ini ...\n";

		// Fil skal allerede finnes, levert med installasjon.
		if (!std::filesystem::exists("konfigurasjon.ini")) {
			GetError("Fant ikke konfigurasjon.ini");
			exit(1);
		}

		// Les fil som binær, siden det kan finnes utf-8 tegn i den.
		std::regex rxDataLinje;
		std::smatch rxM;
		rxDataLinje.assign("^([^;\n].*?):(.*?):(.*?):(.*)");
		std::ifstream innfil("konfigurasjon.ini", std::ios::binary);
		std::string linje = "";

		// Ta høyde for evt. tidligere lasting.
		//std::lock_guard<std::mutex> lock(this->ConfigLock);
		ConfigLock.lock();
		trafikkenheter.clear();

		// Hent og behandle datalinjer.
		while (std::getline(innfil, linje)) {

			// Hopp over tomme linjer og kommentarer.
			if (linje.empty() || linje.at(0) == ';') 
				continue;

			// Se etter serverport til WebUI.
			if (linje.substr(0,12) == "SERVER_PORT=") {
				Konfig.SERVER_PORT = linje.substr(12, linje.substr(12).size()-1);
				std::cout << "Serverport som WebUI skal bruke: " << Konfig.SERVER_PORT << " (krever omstart ved endring).\n";
				continue;
			}

			// Se etter trafikkbuffer størrelsesverdi.
			if (linje.substr(0,21) == "TRAFIKKBUFFER_ANTALL=") {
				Konfig.TrafikkBufferAntall = std::stoi(linje.substr(21, linje.substr(21).size()-1));
				std::cout << "Antall bufrede datasett som serverside skal holde: " << std::to_string(Konfig.TrafikkBufferAntall) << "\n\n";
				continue;
			}

			if (!std::regex_search(linje, rxM, rxDataLinje))
				continue;

			// Les inn datalinjer.
			Enhet e;
			e.IP = rxM[1].str();
			e.interfaceport = rxM[2].str();
			e.portalias = rxM[3].str();
			e.tittel = rxM[4].str();

			// Legg i samling hvis tittel ikke er tom.
			// Se konfigurasjonsfil for detaljer.
			if (!e.tittel.empty()) {
				trafikkenheter.push_back(e);
				std::cout << "Innlastet trafikkenhet: " << e.tittel << "\n";
			}
		}
		std::cout << "\n";
		ConfigLock.unlock();

		// Lukk fil etter lesing.
		innfil.close();
	}
} s1;