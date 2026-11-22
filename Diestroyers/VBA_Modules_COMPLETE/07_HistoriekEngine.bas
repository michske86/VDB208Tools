Attribute VB_Name = "HistoriekEngine"
Option Explicit

' ============================================================
' THE DIESTROYERS - HISTORIEKMANAGER V2
' - Historiek blijft bewaard, ook als verkopers later inactief worden.
' - Website toont actieve verkopers via tblVerkopers.Actief.
' - Targets worden per maand mee opgeslagen.
' - NPS blijft bewust simpel: score-only.
' - Incentives zijn verwijderd uit deze architectuur.
' ============================================================

Public Sub InitialiseerHistoriekStructuur()
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False

    MaakOfResetHistoriekTabel "Historiek_Maand", "tblHistoriekMaand", _
        "Periode|EntiteitType|PersoneelsNr|Naam|ShopNr|KPI|SubKPI|Waarde|WaardePct|Stuks|Kansen|Target|TargetPct|VorigJaar|VorigJaarPct|Status|Punten|Bron|LaatsteUpdate"

    MaakOfResetHistoriekTabel "Historiek_Dag", "tblHistoriekDag", _
        "Datum|Periode|ShopNr|Omzet|DagTarget|Documenten|Klanten|KlantenLY|KlantenVsLYPct|GemiddeldeVerkoopprijs|GemiddeldeVerkoopprijsLY|ConcretisatiePct|ConcretisatieLYPct|IsZaterdag|IsZondag|IsUitzonderlijkeZondag|IsFeestdag|IsOpen|Bron|LaatsteUpdate"

    MaakOfResetHistoriekTabel "Historiek_Ranking", "tblHistoriekRanking", _
        "Periode|PersoneelsNr|Naam|Ranking|Score|AantalGroen|AantalGeel|AantalRood|AantalPodiumGoud|AantalPodiumZilver|AantalPodiumBrons|LaatsteUpdate"

    MaakOfResetHistoriekTabel "KPI_Catalogus", "tblKpiCatalogus", _
        "KPI|SubKPI|Type|Eenheid|HeeftStuks|HeeftKansen|HeeftVorigJaar|HistoriekActief|WebsiteDetail|Opmerking"

    VulKpiCatalogus

    Application.DisplayAlerts = True
    Application.ScreenUpdating = True

    MsgBox "Historiekstructuur is klaar.", vbInformation, "The Diestroyers"
End Sub

Public Sub ArchiveerHuidigeMaandNaarHistoriek()
    Dim periode As String
    periode = BepaalHistoriekPeriode()

    EnsureHistoriekBestaat

    VerwijderHistoriekVoorPeriode periode
    ArchiveerMaandResultaten periode
    ArchiveerDagResultaten periode
    ArchiveerRanking periode
End Sub

Private Sub EnsureHistoriekBestaat()
    If Not SheetExists("Historiek_Maand") Or Not TableExists("Historiek_Maand", "tblHistoriekMaand") Then
        InitialiseerHistoriekStructuur
    End If
End Sub

Private Sub ArchiveerMaandResultaten(ByVal periode As String)
    Dim tblR As ListObject, tblH As ListObject, r As ListRow
    Dim ent As String, nm As String, id As String, shop As String, ts As String

    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    Set tblH = ThisWorkbook.Worksheets("Historiek_Maand").ListObjects("tblHistoriekMaand")
    ts = Format(Now, "yyyy-mm-dd hh:nn:ss")

    For Each r In tblR.ListRows
        If CStr(GetCell(tblR, r, "Periode")) = periode Then
            ent = CStr(GetCell(tblR, r, "EntiteitType"))
            nm = CStr(GetCell(tblR, r, "Naam"))
            id = CStr(GetCell(tblR, r, "PersoneelsNr"))
            shop = CStr(GetCell(tblR, r, "ShopNr"))

            AddAmount tblH, periode, ent, id, nm, shop, "Omzet", "", "Omzet", "OmzetTarget", "", "", r, tblR, ts
            AddAmount tblH, periode, ent, id, nm, shop, "Life", "", "Life", "LifeTarget", "Life", "", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "Insurance", "Totaal", "InsuranceStuks", "InsuranceKansen", "InsuranceTargetPct", "", "", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "Abo", "", "AboStuks", "AboKansen", "AboTargetPct", "", "", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "DSP", "", "DSPStuks", "DSPKansen", "DSPTargetPct", "", "", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "SPG", "", "SPGStuks", "SPGKansen", "SPGTargetPct", "", "", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "SRP", "", "SRPStuks", "SRPKansen", "SRPTargetPct", "", "", r, tblR, ts
            AddAmount tblH, periode, ent, id, nm, shop, "Accessoires", "", "Accessoires", "", "", "", r, tblR, ts
            AddPct tblH, periode, ent, id, nm, shop, "Link", "Totaal", "LinkPct", "LinkTargetPct", "", r, tblR, ts
            AddAmount tblH, periode, ent, id, nm, shop, "Monster", "", "Monster", "MonsterTarget", "", "", r, tblR, ts
            AddAmount tblH, periode, ent, id, nm, shop, "NPS", "", "NPS", "NPSTarget", "", "", r, tblR, ts

            AddRatio tblH, periode, ent, id, nm, shop, "BuyWay", "", "BuyWayStuks", "BuyWayKansen", "", "", "", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "Leaders", "", "LeadersStuks", "LeadersKansen", "", "LeadersStuksLY", "LeadersPctLY", r, tblR, ts
            AddDetail tblH, periode, ent, id, nm, shop, "S", "", "SEuro", "SRatio", "SStuks", "", "", "", "SEuroLY", "SRatioLY", r, tblR, ts

            AddRatio tblH, periode, ent, id, nm, shop, "Insurance", "Mobiel", "InsuranceMobielStuks", "InsuranceMobielKansen", "", "InsuranceMobielStuksLY", "InsuranceMobielPctLY", r, tblR, ts
            AddRatio tblH, periode, ent, id, nm, shop, "Insurance", "Multimedia", "InsuranceMultimediaStuks", "InsuranceMultimediaKansen", "", "InsuranceMultimediaStuksLY", "InsuranceMultimediaPctLY", r, tblR, ts

            AddPct tblH, periode, ent, id, nm, shop, "Link", "GEM", "LinkGEM", "", "", r, tblR, ts
            AddPct tblH, periode, ent, id, nm, shop, "Link", "PEM", "LinkPEM", "", "", r, tblR, ts
            AddPct tblH, periode, ent, id, nm, shop, "Link", "RTV", "LinkRTV", "", "", r, tblR, ts
            AddPct tblH, periode, ent, id, nm, shop, "Link", "COMM", "LinkCOMM", "", "", r, tblR, ts
            AddPct tblH, periode, ent, id, nm, shop, "Link", "MM", "LinkMM", "", "", r, tblR, ts
        End If
    Next r
End Sub

Private Sub AddAmount(ByVal tblH As ListObject, ByVal periode As String, ByVal ent As String, ByVal id As String, ByVal nm As String, ByVal shop As String, ByVal kpi As String, ByVal subKpi As String, ByVal valCol As String, ByVal targetCol As String, ByVal stuksCol As String, ByVal lyCol As String, ByVal r As ListRow, ByVal tblR As ListObject, ByVal ts As String)
    AddDetail tblH, periode, ent, id, nm, shop, kpi, subKpi, valCol, "", stuksCol, "", targetCol, "", lyCol, "", r, tblR, ts
End Sub

Private Sub AddPct(ByVal tblH As ListObject, ByVal periode As String, ByVal ent As String, ByVal id As String, ByVal nm As String, ByVal shop As String, ByVal kpi As String, ByVal subKpi As String, ByVal pctCol As String, ByVal targetPctCol As String, ByVal lyPctCol As String, ByVal r As ListRow, ByVal tblR As ListObject, ByVal ts As String)
    AddDetail tblH, periode, ent, id, nm, shop, kpi, subKpi, "", pctCol, "", "", "", targetPctCol, "", lyPctCol, r, tblR, ts
End Sub

Private Sub AddRatio(ByVal tblH As ListObject, ByVal periode As String, ByVal ent As String, ByVal id As String, ByVal nm As String, ByVal shop As String, ByVal kpi As String, ByVal subKpi As String, ByVal stuksCol As String, ByVal kansenCol As String, ByVal targetPctCol As String, ByVal lyStuksCol As String, ByVal lyPctCol As String, ByVal r As ListRow, ByVal tblR As ListObject, ByVal ts As String)
    Dim st As Double, ka As Double, pct As Double
    st = CDblSafe(GetCell(tblR, r, stuksCol))
    ka = CDblSafe(GetCell(tblR, r, kansenCol))
    If ka <> 0 Then pct = st / ka * 100 Else pct = 0
    AddHistoriekRegel tblH, periode, ent, id, nm, shop, kpi, subKpi, "", pct, st, ka, "", GetCell(tblR, r, targetPctCol), GetCell(tblR, r, lyStuksCol), GetCell(tblR, r, lyPctCol), ts
End Sub

Private Sub AddDetail(ByVal tblH As ListObject, ByVal periode As String, ByVal ent As String, ByVal id As String, ByVal nm As String, ByVal shop As String, ByVal kpi As String, ByVal subKpi As String, ByVal valCol As String, ByVal pctCol As String, ByVal stuksCol As String, ByVal kansenCol As String, ByVal targetCol As String, ByVal targetPctCol As String, ByVal lyCol As String, ByVal lyPctCol As String, ByVal r As ListRow, ByVal tblR As ListObject, ByVal ts As String)
    AddHistoriekRegel tblH, periode, ent, id, nm, shop, kpi, subKpi, GetCell(tblR, r, valCol), GetCell(tblR, r, pctCol), GetCell(tblR, r, stuksCol), GetCell(tblR, r, kansenCol), GetCell(tblR, r, targetCol), GetCell(tblR, r, targetPctCol), GetCell(tblR, r, lyCol), GetCell(tblR, r, lyPctCol), ts
End Sub

Private Sub AddHistoriekRegel(ByVal tbl As ListObject, ByVal periode As String, ByVal ent As String, ByVal id As String, ByVal nm As String, ByVal shop As String, ByVal kpi As String, ByVal subKpi As String, ByVal waarde As Variant, ByVal waardePct As Variant, ByVal stuks As Variant, ByVal kansen As Variant, ByVal target As Variant, ByVal targetPct As Variant, ByVal ly As Variant, ByVal lyPct As Variant, ByVal ts As String)
    Dim lr As ListRow
    Dim p As Double, tar As Double, val As Double, status As String, punten As Long

    If CStr(waarde) = "" And CStr(waardePct) = "" And CStr(stuks) = "" And CStr(kansen) = "" Then Exit Sub

    Set lr = tbl.ListRows.Add
    SetCell tbl, lr, "Periode", periode
    SetCell tbl, lr, "EntiteitType", ent
    SetCell tbl, lr, "PersoneelsNr", id
    SetCell tbl, lr, "Naam", nm
    SetCell tbl, lr, "ShopNr", shop
    SetCell tbl, lr, "KPI", kpi
    SetCell tbl, lr, "SubKPI", subKpi
    SetCell tbl, lr, "Waarde", waarde
    SetCell tbl, lr, "WaardePct", waardePct
    SetCell tbl, lr, "Stuks", stuks
    SetCell tbl, lr, "Kansen", kansen
    SetCell tbl, lr, "Target", target
    SetCell tbl, lr, "TargetPct", targetPct
    SetCell tbl, lr, "VorigJaar", ly
    SetCell tbl, lr, "VorigJaarPct", lyPct

    val = IIf(CDblSafe(waardePct) <> 0, CDblSafe(waardePct), CDblSafe(waarde))
    tar = IIf(CDblSafe(targetPct) <> 0, CDblSafe(targetPct), CDblSafe(target))
    If tar <> 0 Then p = val / tar * 100 Else p = 0

    If tar = 0 Then
        status = ""
        punten = 0
    ElseIf p >= 100 Then
        status = "Groen"
        punten = 3
    ElseIf p >= 90 Then
        status = "Geel"
        punten = 1
    Else
        status = "Rood"
        punten = 0
    End If

    SetCell tbl, lr, "Status", status
    SetCell tbl, lr, "Punten", punten
    SetCell tbl, lr, "Bron", "Resultaten"
    SetCell tbl, lr, "LaatsteUpdate", ts
End Sub

Private Sub ArchiveerDagResultaten(ByVal periode As String)
    ' Voor daghistoriek blijft WebsiteExport/sales-days-data de operationele bron.
    ' Deze structuur staat klaar voor maandelijkse/dagelijkse uitbreiding zonder de website te breken.
End Sub

Private Sub ArchiveerRanking(ByVal periode As String)
    ' Rankinghistoriek kan later op basis van tblHistoriekMaand worden ingevuld.
End Sub

Private Sub VerwijderHistoriekVoorPeriode(ByVal periode As String)
    DeleteRowsByPeriod "Historiek_Maand", "tblHistoriekMaand", periode
    DeleteRowsByPeriod "Historiek_Dag", "tblHistoriekDag", periode
    DeleteRowsByPeriod "Historiek_Ranking", "tblHistoriekRanking", periode
End Sub

Private Sub DeleteRowsByPeriod(ByVal sheetName As String, ByVal tableName As String, ByVal periode As String)
    Dim tbl As ListObject, i As Long
    On Error GoTo Stoppen
    Set tbl = ThisWorkbook.Worksheets(sheetName).ListObjects(tableName)
    For i = tbl.ListRows.Count To 1 Step -1
        If CStr(GetCell(tbl, tbl.ListRows(i), "Periode")) = periode Then tbl.ListRows(i).Delete
    Next i
Stoppen:
End Sub

Private Sub MaakOfResetHistoriekTabel(ByVal sheetName As String, ByVal tableName As String, ByVal headersPipe As String)
    Dim ws As Worksheet, headers As Variant, i As Long, rng As Range
    Set ws = GetOrCreateSheet(sheetName)
    ws.Cells.Clear
    headers = Split(headersPipe, "|")
    For i = LBound(headers) To UBound(headers)
        ws.Cells(1, i + 1).value = headers(i)
        ws.Cells(1, i + 1).Font.Bold = True
        ws.Cells(1, i + 1).Interior.Color = RGB(120, 0, 0)
        ws.Cells(1, i + 1).Font.Color = RGB(255, 255, 255)
    Next i
    Set rng = ws.Range(ws.Cells(1, 1), ws.Cells(2, UBound(headers) + 1))
    On Error Resume Next
    ws.ListObjects(tableName).Delete
    On Error GoTo 0
    ws.ListObjects.Add(xlSrcRange, rng, , xlYes).name = tableName
    ws.Columns.AutoFit
End Sub

Private Sub VulKpiCatalogus()
    Dim tbl As ListObject
    Set tbl = ThisWorkbook.Worksheets("KPI_Catalogus").ListObjects("tblKpiCatalogus")
    Do While tbl.ListRows.Count > 0
        tbl.ListRows(1).Delete
    Loop

    AddKpi tbl, "Omzet", "", "Bedrag", "EUR", "NEE", "NEE", "JA", "JA", "JA", "Omzet % vs vorig jaar op winkelniveau."
    AddKpi tbl, "Life", "", "Aantal", "stuks", "JA", "NEE", "NEE", "JA", "JA", "Score-only in stuks."
    AddKpi tbl, "Insurance", "Totaal", "Ratio", "%", "JA", "JA", "JA", "JA", "JA", ""
    AddKpi tbl, "Insurance", "Mobiel", "Ratio", "%", "JA", "JA", "JA", "JA", "JA", "Detailpagina Insurance."
    AddKpi tbl, "Insurance", "Multimedia", "Ratio", "%", "JA", "JA", "JA", "JA", "JA", "Detailpagina Insurance."
    AddKpi tbl, "SPG", "", "Ratio", "%", "JA", "JA", "NEE", "JA", "JA", ""
    AddKpi tbl, "SRP", "", "Ratio", "%", "JA", "JA", "NEE", "JA", "JA", ""
    AddKpi tbl, "DSP", "", "Ratio", "%", "JA", "JA", "NEE", "JA", "JA", ""
    AddKpi tbl, "Abo", "", "Ratio", "%", "JA", "JA", "NEE", "JA", "JA", ""
    AddKpi tbl, "S", "", "Ratio/Bedrag", "%/EUR", "JA", "NEE", "JA", "JA", "JA", "Laatste stuks."
    AddKpi tbl, "Accessoires", "", "Bedrag/Ratio", "EUR/%", "NEE", "NEE", "NEE", "JA", "JA", ""
    AddKpi tbl, "BuyWay", "", "Ratio", "%", "JA", "JA", "NEE", "JA", "JA", ""
    AddKpi tbl, "Leaders", "", "Ratio", "%", "JA", "JA", "JA", "JA", "JA", ""
    AddKpi tbl, "Link", "Totaal", "Ratio", "%", "NEE", "NEE", "NEE", "JA", "JA", ""
    AddKpi tbl, "Link", "GEM", "Ratio", "%", "NEE", "NEE", "NEE", "JA", "JA", "Detailpagina Link."
    AddKpi tbl, "Link", "PEM", "Ratio", "%", "NEE", "NEE", "NEE", "JA", "JA", "Detailpagina Link."
    AddKpi tbl, "Link", "RTV", "Ratio", "%", "NEE", "NEE", "NEE", "JA", "JA", "Detailpagina Link."
    AddKpi tbl, "Link", "COMM", "Ratio", "%", "NEE", "NEE", "NEE", "JA", "JA", "Detailpagina Link."
    AddKpi tbl, "Link", "MM", "Ratio", "%", "NEE", "NEE", "NEE", "JA", "JA", "Detailpagina Link."
    AddKpi tbl, "NPS", "", "Score", "score", "NEE", "NEE", "NEE", "JA", "JA", "Bewust simpel: enkel score."
End Sub

Private Sub AddKpi(ByVal tbl As ListObject, ByVal kpi As String, ByVal subKpi As String, ByVal typ As String, ByVal eenheid As String, ByVal stuks As String, ByVal kansen As String, ByVal ly As String, ByVal actief As String, ByVal detail As String, ByVal opm As String)
    Dim lr As ListRow
    Set lr = tbl.ListRows.Add
    SetCell tbl, lr, "KPI", kpi
    SetCell tbl, lr, "SubKPI", subKpi
    SetCell tbl, lr, "Type", typ
    SetCell tbl, lr, "Eenheid", eenheid
    SetCell tbl, lr, "HeeftStuks", stuks
    SetCell tbl, lr, "HeeftKansen", kansen
    SetCell tbl, lr, "HeeftVorigJaar", ly
    SetCell tbl, lr, "HistoriekActief", actief
    SetCell tbl, lr, "WebsiteDetail", detail
    SetCell tbl, lr, "Opmerking", opm
End Sub

Private Function BepaalHistoriekPeriode() As String
    If Day(Date) = 1 Then
        BepaalHistoriekPeriode = Format(DateAdd("m", -1, Date), "yyyy-mm")
    Else
        BepaalHistoriekPeriode = Format(Date, "yyyy-mm")
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

Private Function SheetExists(ByVal sheetName As String) As Boolean
    On Error GoTo Fout
    SheetExists = Not ThisWorkbook.Worksheets(sheetName) Is Nothing
    Exit Function
Fout:
    SheetExists = False
End Function

Private Function TableExists(ByVal sheetName As String, ByVal tableName As String) As Boolean
    On Error GoTo Fout
    TableExists = Not ThisWorkbook.Worksheets(sheetName).ListObjects(tableName) Is Nothing
    Exit Function
Fout:
    TableExists = False
End Function

Private Function GetCell(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String) As Variant
    On Error GoTo Fout
    If colName = "" Then GetCell = "": Exit Function
    GetCell = r.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
Fout:
    GetCell = ""
End Function

Private Sub SetCell(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String, ByVal value As Variant)
    On Error Resume Next
    r.Range.Cells(1, tbl.ListColumns(colName).Index).value = value
End Sub

Private Function CDblSafe(ByVal value As Variant) As Double
    CDblSafe = DiestroyersNumber(value)
End Function
