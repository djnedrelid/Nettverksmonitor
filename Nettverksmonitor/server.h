#pragma once
bool global_webuiserver_stoppsignal = false;

class http_get_server 
{
	SOCKET listen_socket, work_socket;
	int remote_addr_len;
	addrinfo hints, *res;
	sockaddr remote_addr;
	char recvBuf[4096];

	public:
	void StartServer()
	{
		// Konfigurerer hints struktur til getaddrinfo.
		memset(&hints, 0, sizeof(hints));
		hints.ai_family = AF_INET;
		hints.ai_socktype = SOCK_STREAM;
		hints.ai_flags = AI_PASSIVE;
	
		// Opprett sockaddr struktur for IP adressen det skal lyttes på.
		std::cout << u8"Starter WebUI på port: " << Konfig.SERVER_PORT << "\n";
		if (getaddrinfo("0.0.0.0", Konfig.SERVER_PORT.c_str(), &hints, &res) != 0) {
			std::cout << "getaddrinfo feilet, WebUI server kunne ikke starte.\n";
			GetError("getaddrinfo feilet.");
			return;
		}
		
		// Sett opp en lytte-socket.
		if ((listen_socket = socket(res->ai_family, res->ai_socktype, res->ai_protocol)) == INVALID_SOCKET) {
			std::cout << "http_get_server > Feilet ved oppsett av lytte-socket.\n\n";
			return;
		}

		// Binder IP til lytte-socket.
		if (bind(listen_socket, res->ai_addr, (int)res->ai_addrlen) != 0) {
			std::cout << "http_get_server > Feilet ved binding av IP.\n\n";
			closesocket(listen_socket);
			return;
		}

		// Sett opp lytting.
		if (listen(listen_socket, SOMAXCONN) != 0) {
			std::cout << "http_get_server > Feilet ved oppsett av lytting.\n\n";
			closesocket(listen_socket);
			return;
		}

		// remote_addr_len må initielt ha størrelsen til remote_addr.
		// når kallet er over, har remote_addr_len størrelsen til returnert adresse.
		memset(&remote_addr, 0, sizeof(sockaddr));
		remote_addr_len = sizeof(remote_addr);

		// Lytteloop i blokkeringsmodus.
		std::cout << "Lytter etter tilkoblinger.\n";
		while ((work_socket = accept(listen_socket, &remote_addr, &remote_addr_len)) != INVALID_SOCKET && !global_webuiserver_stoppsignal) {

			// Motta data.
			memset(recvBuf, 0, sizeof(recvBuf));

			// Sett opp en timeout, i så recv() ikke blokkerer for evig når jeg avslutter.
			unsigned long mode = 1;
			ioctlsocket(work_socket, FIONBIO, &mode);
			fd_set read_fds;
			FD_ZERO(&read_fds);
			FD_SET(work_socket, &read_fds);
			struct timeval timeout;
			timeout.tv_sec = 10;
			timeout.tv_usec = 0;
			if (select(0, &read_fds, 0, 0, &timeout) == 0) {
				std::cout << "WebUI server timeout ...\n";
				break;
			}

			std::string recv_get_line = "";
			while (recv(work_socket, recvBuf, sizeof(recvBuf), 0) > 0) {
			
				// Debugging.
				//std::cout << "Mottatt data: " << recvBuf << "\n";
			
				// Hent første linje som burde være GET streng.
				for (int a=0; a<strlen(recvBuf); a++) {
					if (recvBuf[a] != '\n') {
						recv_get_line += recvBuf[a];
					} else {
						break;
					}
				}

				// Det burde ha vært mottatt en stor nok bulk i første omgang til å få med hele GET strengen.
				break;
			}

			// Bruk regex til å skjære ut mottatt GET data.
			std::regex rxGetData;
			rxGetData.assign("GET \\/(.*?) HTTP\\/");
			std::smatch rxGetDataMatch;
			if (std::regex_search(recv_get_line, rxGetDataMatch, rxGetData)) {

				//
				//	En GET streng ble fanget opp, håndter den.
				//	http_get_server_responder vil håndtere variabeldata i GET strengen og bygge en respons.
				//
				//std::cout << "GET data mottatt: " << rxGetDataMatch[1].str() << "\n";
				std::string respons = http_get_server_responder::ReceivedGetString(rxGetDataMatch[1].str());
				send(work_socket, respons.c_str(), (int)respons.size(), 0);
			
			} else {
				// Gi FYI indikasjon i konsoll i tilfelle det er interessant. 
				setlocale(LC_ALL,"en_US.UTF-8");
				std::cout << u8"\nIngen GET data fanget opp, lukker tilkobling og venter på neste.\n";
			}
			
			// Lukk tilkobling.
			closesocket(work_socket);
		}

		closesocket(listen_socket);
		std::cout << "Server stoppet OK.\n";
	}
};