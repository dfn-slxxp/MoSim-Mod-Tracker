; MoSim Mod Tracker — Windows Installer
; Built with Inno Setup 6.3+ (https://jrsoftware.org/isinfo.php)
;
; Prerequisites:
;   1. python installer/generate-assets.py   (creates installer/assets/)
;   2. pyinstaller app/mosim-tracker.spec    (creates dist/mosim-tracker/)
;   3. iscc installer/windows/setup.iss      (creates dist/installers/*.exe)
; ────────────────────────────────────────────────────────────────────────────

#define AppName      "MoSim Mod Tracker"
#define AppVersion   "1.0.0"
#define AppPublisher "dfn-slxxp"
#define AppURL       "https://github.com/dfn-slxxp/mosim-mod-tracker"
#define AppExeName   "MoSim Mod Tracker.exe"
#define AppId        "{{8A1C9D7E-5F32-4B89-A6D1-3E729CF8B045}"
; Point to repo root (two levels above this .iss file)
#define Root         "..\.."

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/issues
AppUpdatesURL={#AppURL}/releases

; Install per-user (no UAC prompt needed)
DefaultDirName={userpf}\{#AppName}
DefaultGroupName={#AppName}
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Output
OutputDir={#Root}\dist\installers
OutputBaseFilename=MoSim-Mod-Tracker-Setup-{#AppVersion}-win64
SetupIconFile={#Root}\installer\assets\icon.ico

; Visual
WizardStyle=modern
WizardImageFile={#Root}\installer\assets\wizard-side.bmp
WizardSmallImageFile={#Root}\installer\assets\wizard-small.bmp
WizardSizePercent=100

; Compression
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; Misc
DisableProgramGroupPage=no
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}
MinVersion=10.0.17763   ; Windows 10 1809+ (WebView2 ships with Win10/11)
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";     Description: "Create a &desktop shortcut";     GroupDescription: "Shortcuts:"
Name: "startupicon";     Description: "Launch at &startup (minimised)"; GroupDescription: "Shortcuts:"; Flags: unchecked

[Files]
; The PyInstaller output directory — everything inside it
Source: "{#Root}\dist\mosim-tracker\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}";                 Filename: "{app}\{#AppExeName}"
Name: "{group}\Uninstall {#AppName}";       Filename: "{uninstallexe}"
Name: "{commondesktop}\{#AppName}";         Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{userstartup}\{#AppName}";           Filename: "{app}\{#AppExeName}"; Parameters: "--minimised"; Tasks: startupicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Launch {#AppName}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Remove the config file the installer wrote
Type: files; Name: "{app}\mosim.conf"

; ── Pascal code ─────────────────────────────────────────────────────────────

[Code]

var
  ServerURLPage: TInputQueryWizardPage;
  WebView2WarnShown: Boolean;

// ── WebView2 check ────────────────────────────────────────────────────────

function WebView2Installed: Boolean;
var
  Key: String;
begin
  // WebView2 may be installed machine-wide or per-user
  Key := 'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}';
  Result := RegKeyExists(HKEY_LOCAL_MACHINE, Key)
         or RegKeyExists(HKEY_CURRENT_USER,
              'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}');
end;

// ── Wizard pages ──────────────────────────────────────────────────────────

procedure InitializeWizard;
begin
  // Custom page: server URL  (inserted after Select Directory)
  ServerURLPage := CreateInputQueryPage(
    wpSelectDir,
    'Server Configuration',
    'Connect to your MoSim Mod Tracker server',
    'The app loads from a server you run yourself (locally or on a VPS).' + #13#10 +
    'You can change this later by editing mosim.conf in the install folder.'
  );
  ServerURLPage.Add('Server URL:', False);
  ServerURLPage.Values[0] := 'http://localhost:8787';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;

  // Validate server URL is not blank
  if CurPageID = ServerURLPage.ID then begin
    if Trim(ServerURLPage.Values[0]) = '' then begin
      MsgBox('Please enter a server URL (e.g. http://localhost:8787).', mbError, MB_OK);
      Result := False;
      Exit;
    end;
  end;

  // Warn about WebView2 on the Ready page
  if (CurPageID = wpReady) and (not WebView2Installed) and (not WebView2WarnShown) then begin
    WebView2WarnShown := True;
    if MsgBox(
      'Microsoft WebView2 Runtime was not detected on this machine.' + #13#10 + #13#10 +
      'MoSim Mod Tracker requires WebView2, which ships with Windows 11 and most ' +
      'up-to-date Windows 10 installations.' + #13#10 + #13#10 +
      'After installation, if the app doesn''t open, download WebView2 from:' + #13#10 +
      'https://developer.microsoft.com/en-us/microsoft-edge/webview2/' + #13#10 + #13#10 +
      'Continue installing anyway?',
      mbConfirmation, MB_YESNO) = IDNO then
        Result := False;
  end;
end;

// ── Write config file after files are laid down ───────────────────────────

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigPath: String;
  ServerURL: String;
begin
  if CurStep = ssPostInstall then begin
    ConfigPath := ExpandConstant('{app}\mosim.conf');
    ServerURL  := Trim(ServerURLPage.Values[0]);
    if ServerURL = '' then ServerURL := 'http://localhost:8787';
    SaveStringToFile(ConfigPath, 'MOSIM_URL=' + ServerURL + #13#10, False);
  end;
end;

// ── Summary page: show the URL the user picked ────────────────────────────

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := MemoDirInfo + NewLine + NewLine +
            'Server URL:' + NewLine + Space + ServerURLPage.Values[0] + NewLine + NewLine +
            MemoGroupInfo + NewLine + NewLine +
            MemoTasksInfo;
end;
