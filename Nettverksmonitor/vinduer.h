#pragma once

// Hånterer av konsollvindu X knapp for å få skjult systray ikon.
BOOL WINAPI CtrlHandler(DWORD fdwCtrlType)
{
	switch (fdwCtrlType) {
		case CTRL_CLOSE_EVENT:
			m1.HideTrayIcon();
			return 1;
	}
	return 0;
}

void OpprettVinduer()
{
	// Registrer vinduklasse for systraymeny.
	WNDCLASSA wc = {};
	wc.lpfnWndProc = SysTrayCallback;
	wc.hInstance = GetModuleHandle(0);
	wc.lpszClassName = "TrayIconWindowClass";
	if (RegisterClassA(&wc) == 0) {
		GetError("Feilet under registrering av vinduklasse for systraymeny.");
		exit(1);
	}

	// Opprett systraymeny.
	m1.SystrayHWND = CreateWindowExA(
		0, 
		wc.lpszClassName, 
		"Nettverksmonitor",
		0, 0, 0, 0, 0, 
		HWND_MESSAGE, 
		0, 
		wc.hInstance, 
		0
	);
	if (m1.SystrayHWND == 0) {
		GetError("Feilet under opprettelse av vindu for systraymeny.");
		exit(1);
	}
}