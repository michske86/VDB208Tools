Attribute VB_Name = "ImportEngine"
Option Explicit

' ============================================================
' THE DIESTROYERS - IMPORT ENGINE
' Herstelde, bewezen importmethode.
'
' Belangrijk:
' - Gebruikt dezelfde Workbooks.Open + volledige Cells.Copy-logica
'   als de oorspronkelijke versie waarin de dashboardimports werkten.
' - Geen foutieve UsedRange-kolomcontrole meer.
' - TXT en CSV worden niet zelf opnieuw geparseerd of geconverteerd.
' - Het nieuwste beschikbare TXT/CSV-bestand wordt gebruikt.
' ============================================================

Public Sub OpenAndImportTxtFile(ByVal Location As String, ByVal Importsheet As String)
    ImportSourceFile Location, Importsheet
End Sub

Public Sub ImportAll()
    Dim sources As Variant, targets As Variant, i As Long
    Dim foutNummer As Long, foutBron As String, foutTekst As String

    On Error GoTo Fout

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False

    ThisWorkbook.RefreshAll

    sources = Array( _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_ANA_CPT_DATE-SHP", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_CAVC_DATE", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_OMZVGL_S9_PERS_ACC", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_OMZVGL_S9_PERS_MONST", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_SRP_SHP", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_VENTE-BUYWAY-SHOP", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_VENTE-S", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_VKPLINK_ACC", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_VKPLINK_ACC-BINO-NW", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_VKPLINK-ABO-SHP", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WEB_VKPLINK-SFAM_V4_PER_SHOP-VERKOPER", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_ATTACH_RATE_VDBL_COMM_SALES", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WSH_ALL_ATTACH_RATE_VDBL_COMM_SALES_BIPS", _
        "\\edp.lan\vdb-shop\Bal-Sales-Reg\Data Dashboard\WEB_LEADER_S-VERKOPEN_PER_SHOP_PERIODE")

    targets = Array( _
        "I_Count", "I_Sales", "I_Acc", "I_Monst", "I_RDI", "I_BW", "I_S", _
        "I_LinkShop", "I_LinkPers", "I_Abo", "I_Insurance", "I_LifeShops", _
        "I_Life", "I_LeaderS")

    For i = LBound(sources) To UBound(sources)
        ImportSourceFile CStr(sources(i)), CStr(targets(i))
    Next i

    Application.CalculateFullRebuild

Klaar:
    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True

    If foutNummer <> 0 Then
        On Error GoTo 0
        Err.Raise foutNummer, foutBron, foutTekst
    End If
    Exit Sub

Fout:
    foutNummer = Err.Number
    foutBron = Err.Source
    foutTekst = Err.Description
    GoTo Klaar
End Sub

Private Sub ImportSourceFile(ByVal baseLocation As String, ByVal importSheetName As String)
    Dim txtFile As String
    Dim csvFile As String
    Dim fileToOpen As String
    Dim txtDate As Date
    Dim csvDate As Date

    Dim sourceBook As Workbook
    Dim targetSheet As Worksheet

    Dim foutNummer As Long
    Dim foutTekst As String

    On Error GoTo Fout

    Set targetSheet = ThisWorkbook.Worksheets(importSheetName)

    txtFile = baseLocation & ".txt"
    csvFile = baseLocation & ".csv"

    If Dir$(txtFile) <> "" Then txtDate = FileDateTime(txtFile)
    If Dir$(csvFile) <> "" Then csvDate = FileDateTime(csvFile)

    If txtDate = 0 And csvDate = 0 Then
        Err.Raise vbObjectError + 7501, "ImportSourceFile", _
                  "Geen TXT of CSV gevonden voor:" & vbCrLf & baseLocation
    ElseIf txtDate >= csvDate Then
        fileToOpen = txtFile
    Else
        fileToOpen = csvFile
    End If

    ' Exact de oorspronkelijke, bewezen werkwijze:
    ' Excel opent zelf het bronbestand en de volledige eerste sheet wordt gekopieerd.
    Set sourceBook = Workbooks.Open(fileToOpen)

    ' Pas nadat het bronbestand succesvol geopend is, wordt het doelblad gewist.
    targetSheet.Range("A1:AZ65536").ClearContents
    sourceBook.Worksheets(1).Cells.Copy Destination:=targetSheet.Cells

    sourceBook.Close SaveChanges:=False
    Set sourceBook = Nothing
    Exit Sub

Fout:
    foutNummer = Err.Number
    foutTekst = Err.Description

    On Error Resume Next
    If Not sourceBook Is Nothing Then sourceBook.Close SaveChanges:=False
    On Error GoTo 0

    Err.Raise foutNummer, "ImportSourceFile [" & importSheetName & "]", foutTekst
End Sub
