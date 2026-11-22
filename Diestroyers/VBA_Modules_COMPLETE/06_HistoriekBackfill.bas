Attribute VB_Name = "HistoriekBackfill"
Option Explicit

' ============================================================
' THE DIESTROYERS - HISTORIEK BACKFILL IMPORT
' Doel:
'   Importhistoriek.xlsx eenmalig inlezen zonder manueel overtikken.
'
' Verwachte structuur bronbestand:
'   Een werkblad met blokken:
'   - "208 - DIEST"
'   - "17009 - Burcu"
'   - enz.
'
' Per blok:
'   rij start + 0  = header met maanden
'   rij start + 1  = Zakencijfer
'   rij start + 3  = Life stuks
'   rij start + 6  = Insurance totaal stuks
'   rij start + 7  = Insurance totaal kansen
'   rij start + 9  = Insurance Mobiel stuks
'   rij start + 10 = Insurance Mobiel kansen
'   rij start + 12 = Insurance Multimedia stuks
'   rij start + 13 = Insurance Multimedia kansen
'   enz.
'
' Resultaat:
'   - vult/werkt Resultaten bij
'   - vult/werkt Historiek_Maand bij
'   - maakt Controle_HistoriekImport aan
' ============================================================

Public Sub ImporteerHistoriekUitBestand()
    Dim filePath As Variant
    Dim importJaar As Long
    Dim wbSrc As Workbook
    Dim wsSrc As Worksheet
    Dim tblResultaten As ListObject
    Dim tblHistoriek As ListObject
    Dim startRows As Collection
    Dim i As Long, blockStart As Long, blockEnd As Long
    Dim importCount As Long, histCount As Long
    Dim t0 As Double

    On Error GoTo Fout

    t0 = Timer

    filePath = Application.GetOpenFilename( _
        FileFilter:="Excel bestanden (*.xlsx;*.xlsm),*.xlsx;*.xlsm", _
        title:="Selecteer importhistoriek.xlsx")

    If VarType(filePath) = vbBoolean Then Exit Sub

    importJaar = CLng(InputBox("Voor welk jaar wil je deze historiek importeren?", _
                               "Historiek importeren", Year(Date)))
    If importJaar < 2020 Or importJaar > 2100 Then
        MsgBox "Ongeldig jaar.", vbExclamation, "The Diestroyers"
        Exit Sub
    End If

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False

    EnsureResultatenStructuur
    EnsureHistoriekStructuur

    Set tblResultaten = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    Set tblHistoriek = ThisWorkbook.Worksheets("Historiek_Maand").ListObjects("tblHistoriekMaand")

    Set wbSrc = Workbooks.Open(CStr(filePath), UpdateLinks:=False, ReadOnly:=True)
    Set wsSrc = wbSrc.Worksheets(1)

    Set startRows = ZoekBlokStartRijen(wsSrc)

    MaakControleSheet
    LogControle Array("Tijdstip", "Bestand", "Jaar", "Blokken gevonden", "Status")
    LogControle Array(Format(Now, "yyyy-mm-dd hh:nn:ss"), CStr(filePath), importJaar, startRows.Count, "Start import")

    For i = 1 To startRows.Count
        blockStart = CLng(startRows(i))
        If i < startRows.Count Then
            blockEnd = CLng(startRows(i + 1)) - 1
        Else
            blockEnd = wsSrc.Cells(wsSrc.Rows.Count, 1).End(xlUp).row
        End If

        ImporteerBlok wsSrc, blockStart, blockEnd, importJaar, tblResultaten, tblHistoriek, importCount, histCount
    Next i

    wbSrc.Close SaveChanges:=False

    LogControle Array("", "", "", "", "Klaar")
    LogControle Array("Resultaten-rijen bijgewerkt", importCount, "", "", "")
    LogControle Array("Historiekregels bijgewerkt", histCount, "", "", "")
    LogControle Array("Duur seconden", Round(Timer - t0, 1), "", "", "")

    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True

    MsgBox "Historiekimport klaar." & vbCrLf & _
           "Resultaten-rijen bijgewerkt: " & importCount & vbCrLf & _
           "Historiekregels bijgewerkt: " & histCount, _
           vbInformation, "The Diestroyers"

    Exit Sub

Fout:
    On Error Resume Next
    If Not wbSrc Is Nothing Then wbSrc.Close SaveChanges:=False
    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    MsgBox "Historiekimport mislukt: " & Err.Description, vbCritical, "The Diestroyers"
End Sub

Private Sub ImporteerBlok(ByVal ws As Worksheet, ByVal blockStart As Long, ByVal blockEnd As Long, ByVal importJaar As Long, ByVal tblResultaten As ListObject, ByVal tblHistoriek As ListObject, ByRef importCount As Long, ByRef histCount As Long)
    Dim header As String
    Dim entiteitType As String
    Dim naam As String
    Dim personeelsNr As String
    Dim shopNr As String
    Dim col As Long
    Dim maandNr As Long
    Dim periode As String
    Dim rr As ListRow

    header = CellText(ws.Cells(blockStart, 1))
    ParseEntiteit header, entiteitType, naam, personeelsNr, shopNr

    If naam = "" Then Exit Sub

    For col = 2 To 13
        maandNr = MaandNummer(CellText(ws.Cells(blockStart, col)))
        If maandNr > 0 Then
            periode = CStr(importJaar) & "-" & Format(maandNr, "00")

            If BlokHeeftData(ws, blockStart, col) Then
                Set rr = ZoekOfMaakResultaatRij(tblResultaten, periode, entiteitType, naam)

                SetResult tblResultaten, rr, "Periode", periode
                SetResult tblResultaten, rr, "EntiteitType", entiteitType
                SetResult tblResultaten, rr, "Naam", naam
                SetResult tblResultaten, rr, "PersoneelsNr", personeelsNr
                SetResult tblResultaten, rr, "ShopNr", shopNr

                SchrijfResultatenVelden ws, blockStart, col, tblResultaten, rr
                SchrijfHistoriekVelden ws, blockStart, col, periode, entiteitType, personeelsNr, naam, shopNr, tblHistoriek, histCount

                importCount = importCount + 1
                LogControle Array(periode, entiteitType, naam, personeelsNr, "OK")
            End If
        End If
    Next col
End Sub

Private Sub SchrijfResultatenVelden(ByVal ws As Worksheet, ByVal s As Long, ByVal c As Long, ByVal tbl As ListObject, ByVal rr As ListRow)
    ' Hoofd-KPI's
    SetResult tbl, rr, "Omzet", CellNum(ws.Cells(s + 1, c))

    SetResult tbl, rr, "Life", CellNum(ws.Cells(s + 3, c))

    SetResult tbl, rr, "InsuranceStuks", CellNum(ws.Cells(s + 6, c))
    SetResult tbl, rr, "InsuranceKansen", CellNum(ws.Cells(s + 7, c))

    SetResult tbl, rr, "SPGStuks", CellNum(ws.Cells(s + 15, c))
    SetResult tbl, rr, "SPGKansen", CellNum(ws.Cells(s + 16, c))

    SetResult tbl, rr, "SRPStuks", CellNum(ws.Cells(s + 18, c))
    SetResult tbl, rr, "SRPKansen", CellNum(ws.Cells(s + 19, c))

    SetResult tbl, rr, "DSPStuks", CellNum(ws.Cells(s + 21, c))
    SetResult tbl, rr, "DSPKansen", CellNum(ws.Cells(s + 22, c))

    SetResult tbl, rr, "AboStuks", CellNum(ws.Cells(s + 24, c))
    SetResult tbl, rr, "AboKansen", CellNum(ws.Cells(s + 25, c))

    SetResult tbl, rr, "Accessoires", CellNum(ws.Cells(s + 29, c))

    SetResult tbl, rr, "BuyWayPct", CellPct(ws.Cells(s + 30, c))
    SetResult tbl, rr, "BuyWayStuks", CellNum(ws.Cells(s + 31, c))
    SetResult tbl, rr, "BuyWayKansen", CellNum(ws.Cells(s + 32, c))

    SetResult tbl, rr, "LinkPct", CellPct(ws.Cells(s + 33, c))
    SetResult tbl, rr, "LinkGEM", CellPct(ws.Cells(s + 34, c))
    SetResult tbl, rr, "LinkPEM", CellPct(ws.Cells(s + 35, c))
    SetResult tbl, rr, "LinkRTV", CellPct(ws.Cells(s + 36, c))
    SetResult tbl, rr, "LinkCOMM", CellPct(ws.Cells(s + 37, c))
    SetResult tbl, rr, "LinkMM", CellPct(ws.Cells(s + 38, c))

    SetResult tbl, rr, "LeadersPct", CellPct(ws.Cells(s + 39, c))
    SetResult tbl, rr, "LeadersStuks", CellNum(ws.Cells(s + 40, c))
    SetResult tbl, rr, "LeadersKansen", CellNum(ws.Cells(s + 41, c))

    ' Detailvelden
    SetResult tbl, rr, "InsuranceMobielPct", CellPct(ws.Cells(s + 8, c))
    SetResult tbl, rr, "InsuranceMobielStuks", CellNum(ws.Cells(s + 9, c))
    SetResult tbl, rr, "InsuranceMobielKansen", CellNum(ws.Cells(s + 10, c))

    SetResult tbl, rr, "InsuranceMultimediaPct", CellPct(ws.Cells(s + 11, c))
    SetResult tbl, rr, "InsuranceMultimediaStuks", CellNum(ws.Cells(s + 12, c))
    SetResult tbl, rr, "InsuranceMultimediaKansen", CellNum(ws.Cells(s + 13, c))

    SetResult tbl, rr, "SEuro", CellNum(ws.Cells(s + 26, c))
    SetResult tbl, rr, "SStuks", CellNum(ws.Cells(s + 27, c))

    ' SRatio ontbreekt in deze historische bron. Niet foutief afleiden.
End Sub

Private Sub SchrijfHistoriekVelden(ByVal ws As Worksheet, ByVal s As Long, ByVal c As Long, ByVal periode As String, ByVal entiteitType As String, ByVal personeelsNr As String, ByVal naam As String, ByVal shopNr As String, ByVal tblH As ListObject, ByRef histCount As Long)
    Dim ts As String
    ts = Format(Now, "yyyy-mm-dd hh:nn:ss")

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Omzet", "", CellNum(ws.Cells(s + 1, c)), "", "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Life", "", CellNum(ws.Cells(s + 3, c)), "", CellNum(ws.Cells(s + 3, c)), "", "", "", "", "", histCount, ts

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Insurance", "Totaal", "", CellPct(ws.Cells(s + 5, c)), CellNum(ws.Cells(s + 6, c)), CellNum(ws.Cells(s + 7, c)), "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Insurance", "Mobiel", "", CellPct(ws.Cells(s + 8, c)), CellNum(ws.Cells(s + 9, c)), CellNum(ws.Cells(s + 10, c)), "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Insurance", "Multimedia", "", CellPct(ws.Cells(s + 11, c)), CellNum(ws.Cells(s + 12, c)), CellNum(ws.Cells(s + 13, c)), "", "", "", "", histCount, ts

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "SPG", "", "", CellPct(ws.Cells(s + 14, c)), CellNum(ws.Cells(s + 15, c)), CellNum(ws.Cells(s + 16, c)), "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "SRP", "", "", CellPct(ws.Cells(s + 17, c)), CellNum(ws.Cells(s + 18, c)), CellNum(ws.Cells(s + 19, c)), "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "DSP", "", "", CellPct(ws.Cells(s + 20, c)), CellNum(ws.Cells(s + 21, c)), CellNum(ws.Cells(s + 22, c)), "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Abo", "", "", CellPct(ws.Cells(s + 23, c)), CellNum(ws.Cells(s + 24, c)), CellNum(ws.Cells(s + 25, c)), "", "", "", "", histCount, ts

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "S", "", CellNum(ws.Cells(s + 26, c)), "", CellNum(ws.Cells(s + 27, c)), "", "", "", "", "", histCount, ts

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Accessoires", "", CellNum(ws.Cells(s + 29, c)), CellPct(ws.Cells(s + 28, c)), "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "BuyWay", "", "", CellPct(ws.Cells(s + 30, c)), CellNum(ws.Cells(s + 31, c)), CellNum(ws.Cells(s + 32, c)), "", "", "", "", histCount, ts

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "Totaal", "", CellPct(ws.Cells(s + 33, c)), "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "GEM", "", CellPct(ws.Cells(s + 34, c)), "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "PEM", "", CellPct(ws.Cells(s + 35, c)), "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "RTV", "", CellPct(ws.Cells(s + 36, c)), "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "COMM", "", CellPct(ws.Cells(s + 37, c)), "", "", "", "", "", "", histCount, ts
    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "MM", "", CellPct(ws.Cells(s + 38, c)), "", "", "", "", "", "", histCount, ts

    UpsertHist tblH, periode, entiteitType, personeelsNr, naam, shopNr, "Leaders", "", "", CellPct(ws.Cells(s + 39, c)), CellNum(ws.Cells(s + 40, c)), CellNum(ws.Cells(s + 41, c)), "", "", "", "", histCount, ts
End Sub

Private Sub UpsertHist(ByVal tbl As ListObject, ByVal periode As String, ByVal entiteitType As String, ByVal personeelsNr As String, ByVal naam As String, ByVal shopNr As String, ByVal kpi As String, ByVal subKpi As String, ByVal waarde As Variant, ByVal waardePct As Variant, ByVal stuks As Variant, ByVal kansen As Variant, ByVal target As Variant, ByVal targetPct As Variant, ByVal vorigJaar As Variant, ByVal vorigJaarPct As Variant, ByRef histCount As Long, ByVal ts As String)
    Dim r As ListRow
    Dim bestaat As Boolean

    If IsEmptyLike(waarde) And IsEmptyLike(waardePct) And IsEmptyLike(stuks) And IsEmptyLike(kansen) Then Exit Sub

    For Each r In tbl.ListRows
        If CStr(GetT(tbl, r, "Periode")) = periode _
        And LCase(CStr(GetT(tbl, r, "EntiteitType"))) = LCase(entiteitType) _
        And LCase(CStr(GetT(tbl, r, "Naam"))) = LCase(naam) _
        And LCase(CStr(GetT(tbl, r, "KPI"))) = LCase(kpi) _
        And LCase(CStr(GetT(tbl, r, "SubKPI"))) = LCase(subKpi) Then
            bestaat = True
            Exit For
        End If
    Next r

    If Not bestaat Then Set r = tbl.ListRows.Add

    SetT tbl, r, "Periode", periode
    SetT tbl, r, "EntiteitType", entiteitType
    SetT tbl, r, "PersoneelsNr", personeelsNr
    SetT tbl, r, "Naam", naam
    SetT tbl, r, "ShopNr", shopNr
    SetT tbl, r, "KPI", kpi
    SetT tbl, r, "SubKPI", subKpi
    SetT tbl, r, "Waarde", waarde
    SetT tbl, r, "WaardePct", waardePct
    SetT tbl, r, "Stuks", stuks
    SetT tbl, r, "Kansen", kansen
    SetT tbl, r, "Target", target
    SetT tbl, r, "TargetPct", targetPct
    SetT tbl, r, "VorigJaar", vorigJaar
    SetT tbl, r, "VorigJaarPct", vorigJaarPct
    SetT tbl, r, "Bron", "importhistoriek"
    SetT tbl, r, "LaatsteUpdate", ts

    histCount = histCount + 1
End Sub

Private Function ZoekBlokStartRijen(ByVal ws As Worksheet) As Collection
    Dim out As New Collection
    Dim lastRow As Long
    Dim r As Long
    Dim txt As String

    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    For r = 1 To lastRow
        txt = CellText(ws.Cells(r, 1))
        If InStr(1, txt, " - ", vbTextCompare) > 0 Then
            If MaandNummer(CellText(ws.Cells(r, 2))) > 0 Or MaandNummer(CellText(ws.Cells(r, 3))) > 0 Then
                out.Add r
            End If
        End If
    Next r

    Set ZoekBlokStartRijen = out
End Function

Private Sub ParseEntiteit(ByVal header As String, ByRef entiteitType As String, ByRef naam As String, ByRef personeelsNr As String, ByRef shopNr As String)
    Dim p As Long
    Dim leftPart As String
    Dim rightPart As String

    p = InStr(1, header, " - ", vbTextCompare)
    If p = 0 Then Exit Sub

    leftPart = Trim(Left$(header, p - 1))
    rightPart = Trim(Mid$(header, p + 3))

    If UCase(rightPart) = "DIEST" Or leftPart = "208" Then
        entiteitType = "Winkel"
        shopNr = leftPart
        naam = "Diest"
        personeelsNr = ""
    Else
        entiteitType = "Verkoper"
        shopNr = "208"
        personeelsNr = leftPart
        naam = ProperName(rightPart)
    End If
End Sub

Private Function MaandNummer(ByVal m As String) As Long
    m = LCase(Trim(m))
    Select Case m
        Case "jan", "januari": MaandNummer = 1
        Case "feb", "februari": MaandNummer = 2
        Case "maa", "mrt", "maart": MaandNummer = 3
        Case "apr", "april": MaandNummer = 4
        Case "mei": MaandNummer = 5
        Case "jun", "juni": MaandNummer = 6
        Case "jul", "juli": MaandNummer = 7
        Case "aug", "augustus": MaandNummer = 8
        Case "sep", "september": MaandNummer = 9
        Case "okt", "oct", "oktober": MaandNummer = 10
        Case "nov", "november": MaandNummer = 11
        Case "dec", "december": MaandNummer = 12
    End Select
End Function

Private Function BlokHeeftData(ByVal ws As Worksheet, ByVal s As Long, ByVal c As Long) As Boolean
    BlokHeeftData = Not IsEmptyLike(CellNum(ws.Cells(s + 1, c))) _
        Or Not IsEmptyLike(CellNum(ws.Cells(s + 3, c))) _
        Or Not IsEmptyLike(CellNum(ws.Cells(s + 6, c))) _
        Or Not IsEmptyLike(CellNum(ws.Cells(s + 29, c)))
End Function

Private Function ZoekOfMaakResultaatRij(ByVal tbl As ListObject, ByVal periode As String, ByVal entiteitType As String, ByVal naam As String) As ListRow
    Dim r As ListRow

    For Each r In tbl.ListRows
        If CStr(GetT(tbl, r, "Periode")) = periode _
        And LCase(CStr(GetT(tbl, r, "EntiteitType"))) = LCase(entiteitType) _
        And LCase(CStr(GetT(tbl, r, "Naam"))) = LCase(naam) Then
            Set ZoekOfMaakResultaatRij = r
            Exit Function
        End If
    Next r

    Set ZoekOfMaakResultaatRij = tbl.ListRows.Add
End Function

Private Sub EnsureResultatenStructuur()
    Dim tbl As ListObject
    Set tbl = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")

    EnsureColumns tbl, Array( _
        "PersoneelsNr", "ShopNr", _
        "BuyWayStuks", "BuyWayKansen", "BuyWayPct", _
        "LeadersStuks", "LeadersKansen", "LeadersPct", "LeadersStuksLY", "LeadersKansenLY", "LeadersPctLY", _
        "InsuranceMobielStuks", "InsuranceMobielKansen", "InsuranceMobielPct", _
        "InsuranceMultimediaStuks", "InsuranceMultimediaKansen", "InsuranceMultimediaPct", _
        "InsuranceMobielStuksLY", "InsuranceMobielKansenLY", "InsuranceMobielPctLY", _
        "InsuranceMultimediaStuksLY", "InsuranceMultimediaKansenLY", "InsuranceMultimediaPctLY", _
        "LinkGEM", "LinkPEM", "LinkRTV", "LinkCOMM", "LinkMM", _
        "SStuks", "SEuro", "SRatio", "SStuksLY", "SEuroLY", "SRatioLY")
End Sub

Private Sub EnsureHistoriekStructuur()
    Dim ws As Worksheet
    Dim tbl As ListObject

    Set ws = GetOrCreateSheet("Historiek_Maand")

    On Error Resume Next
    Set tbl = ws.ListObjects("tblHistoriekMaand")
    On Error GoTo 0

    If tbl Is Nothing Then
        ws.Cells.Clear
        ws.Range("A1:S1").value = Array("Periode", "EntiteitType", "PersoneelsNr", "Naam", "ShopNr", "KPI", "SubKPI", "Waarde", "WaardePct", "Stuks", "Kansen", "Target", "TargetPct", "VorigJaar", "VorigJaarPct", "Status", "Punten", "Bron", "LaatsteUpdate")
        Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range("A1:S2"), , xlYes)
        tbl.name = "tblHistoriekMaand"
    Else
        EnsureColumns tbl, Array("Periode", "EntiteitType", "PersoneelsNr", "Naam", "ShopNr", "KPI", "SubKPI", "Waarde", "WaardePct", "Stuks", "Kansen", "Target", "TargetPct", "VorigJaar", "VorigJaarPct", "Status", "Punten", "Bron", "LaatsteUpdate")
    End If
End Sub

Private Sub EnsureColumns(ByVal tbl As ListObject, ByVal cols As Variant)
    Dim i As Long
    For i = LBound(cols) To UBound(cols)
        If Not TableHasColumn(tbl, CStr(cols(i))) Then
            tbl.ListColumns.Add.name = CStr(cols(i))
        End If
    Next i
End Sub

Private Function TableHasColumn(ByVal tbl As ListObject, ByVal colName As String) As Boolean
    On Error GoTo Geen
    TableHasColumn = Not tbl.ListColumns(colName) Is Nothing
    Exit Function
Geen:
    TableHasColumn = False
End Function

Private Sub SetResult(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String, ByVal value As Variant)
    EnsureColumns tbl, Array(colName)
    r.Range.Cells(1, tbl.ListColumns(colName).Index).value = value
End Sub

Private Sub SetT(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String, ByVal value As Variant)
    EnsureColumns tbl, Array(colName)
    r.Range.Cells(1, tbl.ListColumns(colName).Index).value = value
End Sub

Private Function GetT(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String) As Variant
    On Error GoTo Fout
    GetT = r.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
Fout:
    GetT = ""
End Function

Private Function CellText(ByVal rng As Range) As String
    On Error GoTo fallback
    CellText = Trim(CStr(rng.Text))
    If CellText = "" Then CellText = Trim(CStr(rng.Value2))
    Exit Function
fallback:
    CellText = ""
End Function

Private Function CellNum(ByVal rng As Range) As Variant
    If IsError(rng.Value) Then
        CellNum = ""
    ElseIf IsEmpty(rng.Value) Then
        CellNum = ""
    ElseIf Trim$(CStr(rng.Value)) = "" Then
        CellNum = ""
    Else
        CellNum = DiestroyersNumber(rng.Value)
    End If
End Function

Private Function CellPct(ByVal rng As Range) As Variant
    Dim v As Variant
    v = CellNum(rng)

    If IsEmptyLike(v) Then
        CellPct = ""
    Else
        If Abs(CDbl(v)) <= 1 Then
            CellPct = CDbl(v) * 100
        Else
            CellPct = CDbl(v)
        End If
    End If
End Function

Private Function IsEmptyLike(ByVal v As Variant) As Boolean
    If IsEmpty(v) Then
        IsEmptyLike = True
    ElseIf IsNull(v) Then
        IsEmptyLike = True
    ElseIf Trim(CStr(v)) = "" Then
        IsEmptyLike = True
    Else
        IsEmptyLike = False
    End If
End Function

Private Function GetOrCreateSheet(ByVal sheetName As String) As Worksheet
    On Error Resume Next
    Set GetOrCreateSheet = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0

    If GetOrCreateSheet Is Nothing Then
        Set GetOrCreateSheet = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        GetOrCreateSheet.name = sheetName
    End If
End Function

Private Function ProperName(ByVal s As String) As String
    If Len(s) = 0 Then
        ProperName = s
    Else
        ProperName = UCase(Left$(s, 1)) & LCase(Mid$(s, 2))
    End If
End Function

Private Sub MaakControleSheet()
    Dim ws As Worksheet
    Set ws = GetOrCreateSheet("Controle_HistoriekImport")
    ws.Cells.Clear
End Sub

Private Sub LogControle(ByVal values As Variant)
    Dim ws As Worksheet
    Dim r As Long
    Set ws = ThisWorkbook.Worksheets("Controle_HistoriekImport")
    r = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    If ws.Cells(1, 1).value = "" Then r = 0
    ws.Cells(r + 1, 1).Resize(1, UBound(values) - LBound(values) + 1).value = values
    ws.Columns.AutoFit
End Sub
