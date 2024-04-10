#define WIN32_LEAN_AND_MEAN // Unngå konflikt med Net-SNMP.
#include <windows.h>
#include <stdio.h>
#include <iostream>
#include <fstream>
#include <sstream>
#include <filesystem>
#include <vector>
#include <regex>
#include <thread>
#include "error.h"
#include "resource.h"
#include "systraymenu.h"
#include "snmp.h"
#include "vindubehandlere.h"
#include "vinduer.h"
#include "server_responder.h"
#include "server.h"

int main(int argc, char* argv[])
{
	// Sjekk om det allerede kjører.
	if (AlreadyRunning())
		return 0;
	
	// Konfigurer vindu.
	SetConsoleTitleW(L"Nettverksmonitor");
	SetConsoleCtrlHandler(CtrlHandler, true);

	OpprettVinduer();
	m1.ShowTrayIcon();

	// Starte skjult?
	if (argc > 1 && memcmp(argv[1], "minimert", 9) == 0)
		SendMessageA(m1.SystrayHWND, WM_COMMAND, MAKEWPARAM(1, 0), 0);
	
	// WSAStartup må kalles èn gang per prosess før winsock kan brukes.
	WORD wVersionRequested = MAKEWORD(2,2);
	WSADATA wsaData;
	if (WSAStartup(wVersionRequested, &wsaData) != 0) {
		std::cout << "WSAStartup feilet.\n";
		GetError("WSAStartup feilet.");
		exit(1);
	}

	// Starter en web ui server i egen tråd.
	http_get_server *hgs = new http_get_server();
	std::thread web_ui_serv(&http_get_server::StartServer, hgs);

	// Starter regelmessig SNMP oppdatering i egen tråd, gi webui litt tid først.
	std::thread snmp_oppdateringstraad(&djSNMP::OppdaterInnUtDataRegelmessig, &s1);

	// Sanntidsmotor.
	MSG Msg;
	std::cout << "Starter nettverksmonitor.\n";
	while(1) {

		// Håndter systemmeldinger til vinduet, diskré.
		while (PeekMessageA(&Msg, 0, 0, 0, PM_REMOVE) != 0) {
			TranslateMessage(&Msg);
			DispatchMessageA(&Msg);
		}

		// Avslutt hvis WM_QUIT har blitt postet.
		if (Msg.message == WM_QUIT)
			break;

		// Oppdater projisering og musebehandling.
		//DoStuff();
	
		// CPU vennlig.
		Sleep(10);
	}

	// Rydd opp og avslutt programmet.
	std::cout << "\nAvslutter ...\n";
	global_webuiserver_stoppsignal = true;
	global_SNMP_oppdateringer_stoppsignal = true;
	web_ui_serv.join();
	snmp_oppdateringstraad.join();
	delete hgs;
	WSACleanup();
	m1.HideTrayIcon();
	return (int)Msg.wParam;
}