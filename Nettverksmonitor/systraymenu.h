#pragma once
#include <shellapi.h>

class SysTrayMenu
{
	NOTIFYICONDATAA nid;

	public:
	HMENU hMenu, hSubMenu;
	HWND SystrayHWND;
	bool MinimertKonsollVindu = false;

	void ShowTrayIcon() 
	{
		nid.cbSize = sizeof(NOTIFYICONDATA);
		nid.hWnd = this->SystrayHWND;
		nid.uID = 1;
		nid.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP | NIF_INFO;
		nid.uCallbackMessage = WM_USER + 1;
		nid.hIcon = LoadIcon(GetModuleHandle(NULL), MAKEINTRESOURCE(IKON1));
		lstrcpynA(nid.szTip, "Nettverksmonitor", sizeof(nid.szTip) / sizeof(nid.szTip[0]));
		Shell_NotifyIconA(NIM_ADD, &nid);
	}

	// Function to hide the notification icon
	void HideTrayIcon() 
	{
		Shell_NotifyIconA(NIM_DELETE, &nid);
	}

	// Oppretter meny per høyreklikk via vindubehandleren.
	void CreateMenu() 
	{
		hMenu = CreatePopupMenu();

		//hSubMenu = CreatePopupMenu();
		//AppendMenuW(hSubMenu, MF_STRING, 10, L"Submenu Item 1");
		//AppendMenuW(hSubMenu, MF_STRING, 11, L"Submenu Item 2");

		// Valg for å vise eller skjule konsollvindu.
		if (!this->MinimertKonsollVindu)
			AppendMenuA(hMenu, MF_STRING, 1, "Skjul konsollvindu");
		else
			AppendMenuA(hMenu, MF_STRING, 2, "Vis konsollvindu");

		// Valg for konfigurasjonsfil.
		AppendMenuA(hMenu, MF_STRING, 3, "Endre konfigurasjon");
		AppendMenuA(hMenu, MF_STRING, 4, "Oppdater konfigurasjon");

		AppendMenuA(hMenu, MF_SEPARATOR, 0, 0);
		//AppendMenuW(hMenu, MF_POPUP, (UINT_PTR)hSubMenu, L"Submenu");
		AppendMenuA(hMenu, MF_STRING, 100, "Avslutt");

		SetForegroundWindow(this->SystrayHWND);

		POINT p;
		GetCursorPos(&p);

		// Opprett meny ved klikk-posisjon.
		TrackPopupMenu(hMenu, TPM_LEFTALIGN | TPM_RIGHTBUTTON, p.x, p.y, 0, this->SystrayHWND, NULL);
	}
} m1;
