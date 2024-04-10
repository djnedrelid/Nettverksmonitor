## Nettverksmonitor

![Example UI_1](eksempelbilde1.png) 

En nettverksmonitor for lokalnettverk for visning av trafikk fra bl.a. switcher og brannmurer.  
Benytter SNMP v2c (public) via Net-SNMP 5.9.4 biblioteket. I verste fall kanskje siste runtime på helt nye systemer.  

**Bruk:**  
Man installerer på en Windows maskin som skal fungere som vert, les og sett opp konfigurasjon.ini, start og koble til port i en nettleser.  

Maskinen eller serveren det blir installert på trenger åpen inngang til angitt port i konfigurasjonsfilen, 
standard 8888, dersom andre maskiner i nettverket skal få tilgang til trafikkoversikten/WebUI i sin nettleser.  

**konfigurasjon.ini**  
Angi port, mellomlagerstørrelse og porter som skal skannes.  
Filen inneholder standardverdier og eksempelporter fra et ekte oppsett som illustrert i eksempelbildet ovenfor.