#pragma once

// Message handler for systray menyen.
LRESULT CALLBACK SysTrayCallback(HWND hwnd, UINT uMsg, WPARAM wParam, LPARAM lParam) {
    switch (uMsg) {
        case WM_USER + 1:
            switch (lParam) {
                case WM_RBUTTONDOWN:
                    m1.CreateMenu();
                    break;
            }
            break;
        case WM_COMMAND:
            switch (LOWORD(wParam)) {
                case 1:
				{
                    // Valg for skjuling av konsollvindu fra systray meny.
					ShowWindow(GetConsoleWindow(), SW_HIDE);
					m1.MinimertKonsollVindu = true;
				}
                    break;

				case 2:
				{
					// Valg for visning av konsollvindu fra systray meny.
					ShowWindow(GetConsoleWindow(), SW_SHOW);
					m1.MinimertKonsollVindu = false;
				}
					break;
				
				case 3:
				{
					// Åpning av konfigurasjonsfil for redigering.
					system("notepad.exe konfigurasjon.ini");
				}
					break;

				case 4:
				{
					// Oppdatering av konfigurasjon.
					s1.LastKonfigurasjon();
				}
					break;

                case 100:
                    PostQuitMessage(0);
                    break;
            }
            break;
        case WM_DESTROY:
            PostQuitMessage(0);
            break;
        default:
            return DefWindowProc(hwnd, uMsg, wParam, lParam);
    }
    return 0;
}