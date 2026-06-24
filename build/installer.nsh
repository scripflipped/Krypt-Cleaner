; ---------------------------------------------------------------------------
;  Krypt Cleaner - custom NSIS installer additions.
;
;  Adds a "Create desktop shortcut" checkbox to the installer Finish page,
;  alongside the default "Run Krypt Cleaner" checkbox. We disable
;  electron-builder's automatic desktop-shortcut creation
;  (createDesktopShortcut: false in package.json) so the user has a real
;  choice instead of always getting a shortcut.
;
;  electron-builder's assistedInstaller.nsh exposes a `customFinishPage`
;  macro that lets us replace the default finish page entirely. We wire up
;  both the launch-after-install checkbox (MUI_FINISHPAGE_RUN) and a second
;  checkbox for shortcut creation (MUI_FINISHPAGE_SHOWREADME hijacked to act
;  as an arbitrary toggle).
;
;  The uninstaller also removes the shortcut (from both per-user and
;  per-machine desktops) if the user created one.
; ---------------------------------------------------------------------------

!macro customFinishPage
  ; Run-after-finish checkbox (same behaviour as electron-builder default).
  Function StartApp
    ${if} ${isUpdated}
      StrCpy $1 "--updated"
    ${else}
      StrCpy $1 ""
    ${endif}
    ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
  FunctionEnd
  !define MUI_FINISHPAGE_RUN
  !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"

  ; Second checkbox: "Create desktop shortcut". We reuse MUI's built-in
  ; SHOWREADME slot — the value of MUI_FINISHPAGE_SHOWREADME is irrelevant
  ; because we provide our own _FUNCTION callback.
  !define MUI_FINISHPAGE_SHOWREADME "_"
  !define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create desktop shortcut"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION KryptCreateDesktopShortcut

  Function KryptCreateDesktopShortcut
    CreateShortCut "$DESKTOP\${PRODUCT_FILENAME}.lnk" "$INSTDIR\${APP_FILENAME}.exe"
  FunctionEnd

  !insertmacro MUI_PAGE_FINISH
!macroend

!macro customUnInstall
  SetShellVarContext current
  Delete "$DESKTOP\${PRODUCT_FILENAME}.lnk"
  SetShellVarContext all
  Delete "$DESKTOP\${PRODUCT_FILENAME}.lnk"
!macroend
