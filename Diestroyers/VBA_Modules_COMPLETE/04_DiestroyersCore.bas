Attribute VB_Name = "DiestroyersCore"
Option Explicit

Private Const DASHBOARD_SHEET As String = "Diestroyers Dashboard"
Private Const PROGRESS_SHAPE As String = "DiestroyersProgressBanner"

Public Sub Diestroyers_DagstartAlles()
    On Error GoTo Fout
    StartRun "Dagstart wordt gestart..."
    SetBusyState True

    UpdateProgress 1, 7, "Adminconfiguratie synchroniseren..."
    SynchroniseerAdminConfiguratie
    If Not AdminSyncIsGeslaagd() Then Err.Raise vbObjectError + 7401, "Diestroyers_DagstartAlles", "Adminconfiguratie kon niet worden gesynchroniseerd."

    UpdateProgress 2, 7, "Stand van gisteren veilig bewaren..."
    NeemGisterenServiceSnapshot

    UpdateProgress 3, 7, "Resultatenbestanden importeren..."
    ImportAll

    UpdateProgress 4, 7, "Resultaten verwerken en historiek bijwerken..."
    VerwerkGeimporteerdeResultaten

    UpdateProgress 5, 7, "Districtgegevens verwerken..."
    VerwerkDistrictActueel

    UpdateProgress 6, 7, "Website- en TV-data publiceren..."
    WebsiteBijwerken

    UpdateProgress 7, 7, "Alles is bijgewerkt."
    FinishRun True, "Dagstart voltooid."
    Exit Sub
Fout:
    FinishRun False, BuildRunError("Dagstart mislukt", Err.Number, Err.Source, Err.Description)
End Sub

Public Sub Diestroyers_AlleenWebsiteUpdaten()
    On Error GoTo Fout
    StartRun "Website-update wordt gestart..."
    SetBusyState True

    UpdateProgress 1, 4, "Adminconfiguratie synchroniseren..."
    SynchroniseerAdminConfiguratie
    If Not AdminSyncIsGeslaagd() Then Err.Raise vbObjectError + 7402, "Diestroyers_AlleenWebsiteUpdaten", "Adminconfiguratie kon niet worden gesynchroniseerd."

    UpdateProgress 2, 4, "Configuratie en actuele resultaten opschonen..."
    ApplyTargetsToResultaten
    OpschonenInactieveVerkopersActuelePeriode
    HerberekenSResultatenActuelePeriode
    VerwerkDistrictActueel

    UpdateProgress 3, 4, "Website- en TV-data publiceren..."
    WebsiteBijwerken

    UpdateProgress 4, 4, "Website is bijgewerkt."
    FinishRun True, "Website-update voltooid."
    Exit Sub
Fout:
    FinishRun False, BuildRunError("Website-update mislukt", Err.Number, Err.Source, Err.Description)
End Sub


Public Sub Diestroyers_HerstelEnPubliceerAlles()
    Dim resolvedPath As String
    On Error GoTo Fout
    StartRun "Volledig projectherstel wordt gestart..."
    SetBusyState True
    UpdateProgress 1, 6, "Lokale projectmap controleren..."
    resolvedPath = LocalProjectPath()
    EnsureLocalAssetsFolder
    UpdateProgress 2, 6, "Adminconfiguratie synchroniseren..."
    SynchroniseerAdminConfiguratie
    If Not AdminSyncIsGeslaagd() Then Err.Raise vbObjectError + 7403, "Diestroyers_HerstelEnPubliceerAlles", "Adminconfiguratie kon niet worden gesynchroniseerd."
    UpdateProgress 3, 6, "Targets en actieve verkopers herstellen..."
    ApplyTargetsToResultaten
    OpschonenInactieveVerkopersActuelePeriode
    UpdateProgress 4, 6, "Resultaten veilig opnieuw opbouwen en district herstellen..."
    VerwerkGeimporteerdeResultaten False, False
    VerwerkDistrictActueel
    UpdateProgress 5, 6, "Website- en TV-bestanden publiceren..."
    WebsiteBijwerken
    UpdateProgress 6, 6, "Databestanden controleren..."
    ControleerWebsiteDatabestanden
    FinishRun True, "Volledig projectherstel voltooid."
    Exit Sub
Fout:
    FinishRun False, "Projectherstel mislukt: fout " & Err.Number & " in " & Err.Source & " - " & Err.Description
End Sub

Public Sub Diestroyers_ControleerInstallatie()
    Dim fouten As String
    fouten = ""
    CheckSheet "Instellingen", fouten
    CheckSheet "Verkopers", fouten
    CheckSheet "Targets", fouten
    CheckSheet "Resultaten", fouten
    CheckSheet "Agenda", fouten
    CheckSheet "District", fouten
    CheckTable "Verkopers", "Verkopers", fouten
    CheckTable "Targets", "Targets", fouten
    CheckTable "Resultaten", "Resultaten", fouten

    If Dir(LocalAssetsFile("config-data.js")) = "" Then
        fouten = fouten & vbCrLf & "- assets\config-data.js ontbreekt"
    End If

    If fouten = "" Then
        MsgBox "De Diestroyers VBA 2.0-installatie is volledig.", vbInformation, "The Diestroyers"
    Else
        MsgBox "Controlepunten:" & vbCrLf & fouten, vbExclamation, "The Diestroyers"
    End If
End Sub

Public Sub Diestroyers_OpenHome()
    OpenLocalFile "home.html"
End Sub

Public Sub Diestroyers_OpenTV()
    OpenLocalFile "tv.html"
End Sub

Public Sub Diestroyers_OpenAdmin()
    OpenLocalFile "admin.html"
End Sub

Private Sub SetBusyState(ByVal busy As Boolean)
    ' Events en waarschuwingen mogen de verwerking niet onderbreken.
    ' Schermverversing moet aan blijven: anders kan de voortgangsbanner
    ' pas zichtbaar worden nadat stap 1 al voorbij is.
    On Error Resume Next
    Application.ScreenUpdating = True
    Application.EnableEvents = Not busy
    Application.DisplayAlerts = Not busy
    If busy Then Application.Cursor = xlWait Else Application.Cursor = xlDefault
    Application.DisplayStatusBar = True
    On Error GoTo 0
End Sub

Private Sub StartRun(ByVal message As String)
    On Error Resume Next
    Application.ScreenUpdating = True
    GetOrCreateDashboardSheet.Activate
    Application.StatusBar = "The Diestroyers :: " & message
    ShowProgressBanner message, 0, 1
    DoEvents
    On Error GoTo 0
End Sub

Private Sub UpdateProgress(ByVal stap As Long, ByVal totaal As Long, ByVal message As String)
    On Error Resume Next
    Application.ScreenUpdating = True
    Application.StatusBar = "The Diestroyers :: stap " & stap & "/" & totaal & " :: " & message
    ShowProgressBanner message, stap, totaal
    DoEvents
    On Error GoTo 0
End Sub

Private Sub FinishRun(ByVal success As Boolean, ByVal message As String)
    ' Deze routine draait na de publicatie. Fouten in de banner/statusbalk
    ' mogen een succesvolle data-update dus nooit alsnog laten mislukken.
    On Error GoTo Klaar
    SetBusyState False
    If success Then
        Application.StatusBar = "The Diestroyers :: " & message
        ShowProgressBanner message, 1, 1, RGB(28, 145, 74)
        PauseSeconds 2
        HideProgressBanner
        Application.StatusBar = False
    Else
        Application.StatusBar = "The Diestroyers :: " & message
        ShowProgressBanner message, 1, 1, RGB(190, 0, 0)
        PauseSeconds 4
        HideProgressBanner
        Application.StatusBar = False
        MsgBox message, vbCritical, "The Diestroyers"
    End If
Klaar:
    On Error Resume Next
    Application.ScreenUpdating = True
    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.Cursor = xlDefault
    Application.StatusBar = False
    On Error GoTo 0
End Sub

Private Sub ShowProgressBanner(ByVal message As String, ByVal stap As Long, ByVal totaal As Long, Optional ByVal kleur As Long = -1)
    Dim ws As Worksheet, shp As Shape, pct As Double, displayText As String
    On Error GoTo Klaar
    Set ws = GetOrCreateDashboardSheet
    If totaal <= 0 Then totaal = 1
    pct = stap / totaal
    If pct < 0 Then pct = 0
    If pct > 1 Then pct = 1
    displayText = "THE DIESTROYERS" & vbCrLf & message & vbCrLf & "Voortgang: " & Format(pct, "0%")

    On Error Resume Next
    Set shp = ws.Shapes(PROGRESS_SHAPE)
    On Error GoTo Klaar

    If shp Is Nothing Then
        Set shp = ws.Shapes.AddShape(msoShapeRoundedRectangle, ws.Range("G2").Left, ws.Range("G2").Top, 520, 120)
        shp.name = PROGRESS_SHAPE
    End If

    With shp
        .Left = ws.Range("G2").Left
        .Top = ws.Range("G2").Top
        .Visible = msoTrue
        If kleur = -1 Then .Fill.ForeColor.RGB = RGB(36, 36, 36) Else .Fill.ForeColor.RGB = kleur
        .Line.ForeColor.RGB = RGB(225, 25, 25)
        .Line.Weight = 2
        .Shadow.Visible = msoTrue
        .Shadow.Transparency = 0.35
        .TextFrame2.TextRange.text = displayText
        .TextFrame2.TextRange.Font.Size = 18
        .TextFrame2.TextRange.Font.Bold = msoTrue
        .TextFrame2.TextRange.Font.Fill.ForeColor.RGB = RGB(255, 255, 255)
        .TextFrame2.VerticalAnchor = msoAnchorMiddle
        .TextFrame2.TextRange.ParagraphFormat.Alignment = msoAlignCenter
        .ZOrder msoBringToFront
    End With
    Application.ScreenUpdating = True
    DoEvents
Klaar:
    Err.Clear
End Sub

Private Function BuildRunError(ByVal prefix As String, ByVal errorNumber As Long, ByVal errorSource As String, ByVal errorDescription As String) As String
    BuildRunError = prefix & ": " & errorDescription
    If errorNumber <> 0 Or Len(errorSource) > 0 Then
        BuildRunError = BuildRunError & vbCrLf & vbCrLf & _
                        "Technische details: fout " & CStr(errorNumber) & _
                        IIf(Len(errorSource) > 0, " in " & errorSource, "")
    End If
End Function

Private Sub HideProgressBanner()
    On Error Resume Next
    GetOrCreateDashboardSheet.Shapes(PROGRESS_SHAPE).Visible = msoFalse
    On Error GoTo 0
    DoEvents
End Sub

Private Sub PauseSeconds(ByVal seconds As Double)
    Dim einde As Date
    einde = DateAdd("s", seconds, Now)
    Do While Now < einde
        DoEvents
    Loop
End Sub

Private Function GetOrCreateDashboardSheet() As Worksheet
    On Error Resume Next
    Set GetOrCreateDashboardSheet = ThisWorkbook.Worksheets(DASHBOARD_SHEET)
    On Error GoTo 0
    If GetOrCreateDashboardSheet Is Nothing Then
        Set GetOrCreateDashboardSheet = ThisWorkbook.Worksheets.Add(Before:=ThisWorkbook.Worksheets(1))
        GetOrCreateDashboardSheet.name = DASHBOARD_SHEET
    End If
End Function

Private Sub CheckSheet(ByVal naam As String, ByRef fouten As String)
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Worksheets(naam)
    On Error GoTo 0
    If ws Is Nothing Then fouten = fouten & vbCrLf & "- Werkblad ontbreekt: " & naam
End Sub

Private Sub CheckTable(ByVal blad As String, ByVal tabel As String, ByRef fouten As String)
    Dim tbl As ListObject
    On Error Resume Next
    Set tbl = ThisWorkbook.Worksheets(blad).ListObjects(tabel)
    On Error GoTo 0
    If tbl Is Nothing Then fouten = fouten & vbCrLf & "- Tabel ontbreekt: " & blad & "!" & tabel
End Sub

Private Sub OpenLocalFile(ByVal fileName As String)
    Dim path As String
    path = LocalProjectFile(fileName)
    If Dir(path) = "" Then
        MsgBox fileName & " werd niet gevonden naast de XLSM.", vbExclamation, "The Diestroyers"
        Exit Sub
    End If
    ThisWorkbook.FollowHyperlink path
End Sub
