#pragma once

class http_get_server_responder
{
	public:
	//
	//	Tar imot GET data og bygger en HTTP respons tilbake.
	//
	static std::string ReceivedGetString(std::string GetData)
	{
		std::string Header = "HTTP/1.1 200 OK\r\n";
		std::string Body = "";

		if (GetData == "") {
			Header += "Content-Type: text/html; charset=UTF-8\r\n\r\n";
			Body = HentFilInnhold("webui\\index.html");

		} else if (GetData.substr(GetData.size()-4) == ".css") {
			Header += "Content-Type: text/css; charset=UTF-8\r\n\r\n";
			Body = HentFilInnhold("webui\\"+ GetData);

		} else if (GetData.substr(GetData.size()-3) == ".js") {
			Header += "Content-Type: text/javascript; charset=UTF-8\r\n\r\n";
			Body = HentFilInnhold("webui\\"+ GetData);

		} else if (GetData.substr(GetData.size()-4) == ".png") {
			Header += "Content-Type: image/png; charset=UTF-8\r\n\r\n";
			Body = HentFilInnhold("webui\\"+ GetData);

		} else if (GetData == "GetTrafikkBufferJSON") {
			Header += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
			Body = s1.GetTrafikkBufferJSON();
		}

		return Header + Body;
	}

	private:
	static std::string HentFilInnhold(std::string FilNavn)
	{
		try {
		std::ifstream Fil(FilNavn, std::ios::binary);
		if (!Fil.is_open())
			throw;
		std::stringstream FilStream;
		FilStream << Fil.rdbuf();
		Fil.close();
		return FilStream.str();

		} catch(...) {
			GetError("HentFilInnhold():");
			exit(1);
		}
	}
};