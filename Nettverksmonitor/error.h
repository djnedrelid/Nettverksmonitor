#pragma once
#include <TlHelp32.h> // for AlreadyRunning() snapshot funksjoner.

//
// Returnerer f.eks. 2021-12-01 17:38:00
//
static std::string DatotidFull()
{
	time_t now = time(0);
	tm tid;
	localtime_s(&tid, &now);
	std::string datotid;

	// Dato.
	datotid.append(((tid.tm_mday) < 10 ? "0" + std::to_string(tid.tm_mday) : std::to_string(tid.tm_mday) ) + ".");
	datotid.append(((tid.tm_mon+1) < 10 ? "0" + std::to_string(tid.tm_mon+1) : std::to_string(tid.tm_mon+1) ) + ".");
	datotid.append(std::to_string(tid.tm_year+1900) + " ");
	
	
	// Vis kun dagsnavn i stedet for å spare plass.
	std::vector<std::string> dager = { u8"Søn","Man","Tir","Ons","Tor","Fre",u8"Lør" };
	for (unsigned int n=0; n<dager.size(); n++)
		if (n == tid.tm_wday)
			datotid.append( dager[n] + " ");

	// Tid.
	datotid.append( ((tid.tm_hour) < 10 ? "0" + std::to_string(tid.tm_hour) : std::to_string(tid.tm_hour) ) + ":");
	datotid.append( ((tid.tm_min) < 10 ? "0" + std::to_string(tid.tm_min) : std::to_string(tid.tm_min) ) + ":");
	datotid.append( ((tid.tm_sec) < 10 ? "0" + std::to_string(tid.tm_sec) : std::to_string(tid.tm_sec) ));

	return datotid;
}

//
//	Generell feilhåndterer av exceptions o.l. i programmet.
//
void GetError(std::string lpszFunction)
{
	int err = GetLastError();
	std::string lpDisplayBuf;
	char* lpMsgBuf;

	FormatMessageA(FORMAT_MESSAGE_ALLOCATE_BUFFER |
		FORMAT_MESSAGE_FROM_SYSTEM |
		FORMAT_MESSAGE_IGNORE_INSERTS,
		NULL,
		err,
		MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		(LPSTR)&lpMsgBuf,
		0,
		NULL);

	lpDisplayBuf.append("(" + std::to_string(err) + ") ");
	lpDisplayBuf.append(lpMsgBuf);

	std::string TotalMessage;
	TotalMessage.append(lpszFunction + "\n\nSystem:\n" + lpDisplayBuf);

	// Arkiver i loggfil også, samme mappe som program.
	std::ofstream loggfil("feilmeldinger.log");
	loggfil << DatotidFull() << ": " << TotalMessage << "\r\n";

	MessageBoxA(
		NULL,
		TotalMessage.c_str(),
		"Information",
		MB_OK | MB_ICONINFORMATION
	);
}


//
//	Hjelpefunksjon for å se om programmet allerede kjører.
//
bool AlreadyRunning()
{
	DWORD current_pid = GetCurrentProcessId();
	HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    PROCESSENTRY32 pe;
    pe.dwSize = sizeof(PROCESSENTRY32);

	Process32First(hSnapshot, &pe);
	do {
        if (pe.th32ProcessID != current_pid && std::wstring(pe.szExeFile) == L"Nettverksmonitor.exe") {
			MessageBoxW(0, L"Nettverksmonitor kjører allerede.", L"Info", MB_OK);
			CloseHandle(hSnapshot);
			return true;
        }
    } while (Process32Next(hSnapshot, &pe));

    // Clean up the process snapshot handle
    CloseHandle(hSnapshot);
	return false;
}