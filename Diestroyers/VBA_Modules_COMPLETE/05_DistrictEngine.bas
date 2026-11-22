Attribute VB_Name = "DistrictEngine"
Option Explicit

' ============================================================
' THE DIESTROYERS - DISTRICT VERGELIJKING
' Doel:
' - Definieer regiowinkels in tabblad District.
' - Vul DistrictActueel met huidige maand winkelresultaten.
' - Exporteer assets/district-data.js voor district.html.
' - Geen historiek: enkel actuele maand.
' ============================================================

Public Sub InitialiseerDistrictVergelijking()
    Dim ws As Worksheet
    Dim tbl As ListObject

    Set ws = GetOrCreateSheetDistrict("District")
    ws.Cells.Clear
    ws.Range("A1:D1").value = Array("ShopNr", "Winkel", "Regio", "Actief")
    Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range("A1:D2"), , xlYes)
    tbl.name = "District"

    ws.Range("A2:D2").value = Array("208", "Diest", "Regio", "JA")
    ws.Columns.AutoFit

    Set ws = GetOrCreateSheetDistrict("DistrictActueel")
    ws.Cells.Clear
    ws.Range("A1:AM1").value = Array( _
        "Periode", "ShopNr", "Winkel", "Regio", "Actief", "EigenWinkel", _
        "Omzet", "OmzetTarget", _
        "Life", "LifeTarget", _
        "InsuranceStuks", "InsuranceKansen", "InsuranceTargetPct", _
        "AboStuks", "AboKansen", "AboTargetPct", _
        "DSPStuks", "DSPKansen", "DSPTargetPct", _
        "SPGStuks", "SPGKansen", "SPGTargetPct", _
        "SRPStuks", "SRPKansen", "SRPTargetPct", _
        "Accessoires", "AccessoiresTargetPct", _
        "LinkPct", "LinkTargetPct", _
        "Monster", "MonsterTarget", _
        "BuyWayStuks", "BuyWayKansen", "BuyWayTargetPct", _
        "LeadersStuks", "LeadersKansen", "LeadersTargetPct", _
        "SRatio", "NPSTarget")
    Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range("A1:AM2"), , xlYes)
    tbl.name = "DistrictActueel"

    MsgBox "Districtvergelijking is klaargezet. Vul tabblad District aan met de winkels uit je regio.", vbInformation, "The Diestroyers"
End Sub

Public Sub VerwerkDistrictActueel(Optional ByVal toonMelding As Boolean = False)
    Dim tblD As ListObject, tblA As ListObject, r As ListRow, rr As ListRow
    Dim shopNr As String, winkel As String, regio As String, actief As String, periode As String

    On Error GoTo Fout

    periode = BepaalDistrictPeriode()
    Set tblD = ThisWorkbook.Worksheets("District").ListObjects("District")
    Set tblA = ThisWorkbook.Worksheets("DistrictActueel").ListObjects("DistrictActueel")

    Do While tblA.ListRows.Count > 0
        tblA.ListRows(1).Delete
    Loop

    For Each r In tblD.ListRows
        shopNr = Trim(CStr(r.Range.Cells(1, tblD.ListColumns("ShopNr").Index).value))
        winkel = Trim(CStr(r.Range.Cells(1, tblD.ListColumns("Winkel").Index).value))
        regio = Trim(CStr(r.Range.Cells(1, tblD.ListColumns("Regio").Index).value))
        actief = Trim(CStr(r.Range.Cells(1, tblD.ListColumns("Actief").Index).value))

        If shopNr <> "" And LCase(actief) <> "nee" And LCase(actief) <> "no" And actief <> "0" Then
            Set rr = tblA.ListRows.Add
            ZetDistrict tblA, rr, "Periode", periode
            ZetDistrict tblA, rr, "ShopNr", shopNr
            ZetDistrict tblA, rr, "Winkel", winkel
            ZetDistrict tblA, rr, "Regio", regio
            ZetDistrict tblA, rr, "Actief", actief
            ZetDistrict tblA, rr, "EigenWinkel", IIf(DistrictShopKey(shopNr) = DistrictShopKey(ThisWorkbook.Worksheets("Instellingen").Range("B7").value), "JA", "NEE")

            ZetDistrict tblA, rr, "Omzet", DistrictWinkelOmzet(shopNr)
            ZetDistrict tblA, rr, "Life", DistrictShopWaarde("I_LifeShops", shopNr, 4)
            ZetDistrict tblA, rr, "LinkPct", DistrictPct(DistrictLinkShop(shopNr))

            ZetDistrict tblA, rr, "InsuranceStuks", DistrictZoekShop("I_Insurance", shopNr, 10)
            ZetDistrict tblA, rr, "InsuranceKansen", DistrictZoekShop("I_Insurance", shopNr, 9)

            ZetDistrict tblA, rr, "AboStuks", DistrictZoekShop("I_Abo", shopNr, 4)
            ZetDistrict tblA, rr, "AboKansen", DistrictZoekShop("I_Abo", shopNr, 3)

            ZetDistrict tblA, rr, "DSPStuks", DistrictZoekShop("I_Abo", shopNr, 7)
            ZetDistrict tblA, rr, "DSPKansen", DistrictZoekShop("I_Abo", shopNr, 6)

            ZetDistrict tblA, rr, "SPGStuks", DistrictRDI(shopNr, 3)
            ZetDistrict tblA, rr, "SPGKansen", DistrictRDI(shopNr, 4)

            ZetDistrict tblA, rr, "SRPStuks", DistrictRDI(shopNr, 11)
            ZetDistrict tblA, rr, "SRPKansen", DistrictRDI(shopNr, 12)

            ZetDistrict tblA, rr, "Accessoires", DistrictAccessoires(shopNr)
            ZetDistrict tblA, rr, "Monster", DistrictMonster(shopNr)

            ZetDistrict tblA, rr, "BuyWayStuks", DistrictZoekShop("I_BW", shopNr, 4)
            ZetDistrict tblA, rr, "BuyWayKansen", DistrictZoekShop("I_BW", shopNr, 3)

            ZetDistrict tblA, rr, "LeadersStuks", DistrictZoekShop("I_LeaderS", shopNr, 4)
            ZetDistrict tblA, rr, "LeadersKansen", DistrictZoekShop("I_LeaderS", shopNr, 3)

            ZetDistrict tblA, rr, "SRatio", DistrictLaatsteStuksPct(shopNr)

            NeemDistrictTargetsOver tblA, rr, periode, shopNr, winkel
        End If
    Next r

    If tblA.ListRows.Count <> DistrictActiveCount(tblD) Then
        Err.Raise vbObjectError + 3201, "VerwerkDistrictActueel", _
                  "Niet alle actieve districtwinkels werden toegevoegd. Verwacht: " & _
                  DistrictActiveCount(tblD) & " - toegevoegd: " & tblA.ListRows.Count
    End If

    If toonMelding Then MsgBox "Cijfers District zijn bijgewerkt voor " & tblA.ListRows.Count & " winkels.", vbInformation, "The Diestroyers"
    Exit Sub

Fout:
    Err.Raise Err.Number, "VerwerkDistrictActueel - " & Err.Source, Err.Description
End Sub

Public Sub ExportDistrictData()
    Dim tbl As ListObject
    Dim r As ListRow
    Dim json As String
    Dim eerste As Boolean

    On Error GoTo Fout

    Set tbl = ThisWorkbook.Worksheets("DistrictActueel").ListObjects("DistrictActueel")

    json = "window.DIESTROYERS_DISTRICT = [" & vbCrLf
    eerste = True

    For Each r In tbl.ListRows
        If Not eerste Then json = json & "," & vbCrLf
        eerste = False
        json = json & "  {"
        json = json & """Periode"":""" & JSDistrict(CellDistrict(tbl, r, "Periode")) & """"
        json = json & ",""ShopNr"":""" & JSDistrict(CellDistrict(tbl, r, "ShopNr")) & """"
        json = json & ",""Winkel"":""" & JSDistrict(CellDistrict(tbl, r, "Winkel")) & """"
        json = json & ",""Regio"":""" & JSDistrict(CellDistrict(tbl, r, "Regio")) & """"
        json = json & ",""Actief"":""" & JSDistrict(CellDistrict(tbl, r, "Actief")) & """"
        json = json & ",""EigenWinkel"":""" & JSDistrict(CellDistrict(tbl, r, "EigenWinkel")) & """"
        json = json & DistrictNumFields(tbl, r, Array("Omzet", "OmzetTarget", "Life", "LifeTarget", "InsuranceStuks", "InsuranceKansen", "InsuranceTargetPct", "AboStuks", "AboKansen", "AboTargetPct", "DSPStuks", "DSPKansen", "DSPTargetPct", "SPGStuks", "SPGKansen", "SPGTargetPct", "SRPStuks", "SRPKansen", "SRPTargetPct", "Accessoires", "AccessoiresTargetPct", "LinkPct", "LinkTargetPct", "Monster", "MonsterTarget", "BuyWayStuks", "BuyWayKansen", "BuyWayTargetPct", "LeadersStuks", "LeadersKansen", "LeadersTargetPct", "SRatio", "NPSTarget"))
        json = json & "}"
    Next r

    json = json & vbCrLf & "];"
    WriteDistrictFile LocalAssetsFile("district-data.js"), json
    Exit Sub

Fout:
    Dim foutNummer As Long, foutBron As String, foutTekst As String
    foutNummer = Err.Number: foutBron = Err.Source: foutTekst = Err.Description
    Err.Raise foutNummer, "ExportDistrictData", foutTekst
End Sub

Private Sub NeemDistrictTargetsOver(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal periode As String, ByVal shopNr As String, ByVal winkel As String)
    Dim tblT As ListObject
    Dim tr As ListRow
    Dim districtRow As ListRow, ownRow As ListRow
    Dim cols As Variant, c As Variant
    Dim tPeriode As String, tType As String, tNaam As String, tShop As String
    Dim eigenShop As String, eigenNaam As String
    Dim value As Variant, fallbackValue As Variant

    On Error GoTo Klaar

    Set tblT = ThisWorkbook.Worksheets("Targets").ListObjects("Targets")
    eigenShop = Trim(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").value))
    eigenNaam = "Diest"

    cols = Array("OmzetTarget", "LifeTarget", "InsuranceTargetPct", "AboTargetPct", "DSPTargetPct", _
                 "SPGTargetPct", "SRPTargetPct", "AccessoiresTargetPct", "LinkTargetPct", _
                 "MonsterTarget", "NPSTarget")

    For Each tr In tblT.ListRows
        tPeriode = NormaliseerDistrictPeriode(CellSafe(tblT, tr, "Periode"))
        tType = LCase(Trim(CStr(CellSafe(tblT, tr, "EntiteitType"))))
        tNaam = LCase(Trim(CStr(CellSafe(tblT, tr, "Naam"))))
        tShop = Trim(CStr(CellSafe(tblT, tr, "ShopNr")))

        If tPeriode = periode Then
            If tType = "districtwinkel" Then
                If (tShop <> "" And DistrictShopKey(tShop) = DistrictShopKey(shopNr)) Or (tNaam <> "" And tNaam = LCase(Trim(winkel))) Then
                    Set districtRow = tr
                End If
            ElseIf tType = "winkel" Then
                If (tShop <> "" And DistrictShopKey(tShop) = DistrictShopKey(eigenShop)) Or tNaam = LCase(eigenNaam) Then
                    Set ownRow = tr
                End If
            End If
        End If
    Next tr

    For Each c In cols
        value = 0
        fallbackValue = 0

        If Not districtRow Is Nothing Then value = CellSafe(tblT, districtRow, CStr(c))
        If Not ownRow Is Nothing Then fallbackValue = CellSafe(tblT, ownRow, CStr(c))

        If NumDistrict(value) = 0 And NumDistrict(fallbackValue) <> 0 Then value = fallbackValue
        ZetDistrict tbl, rr, CStr(c), value
    Next c

Klaar:
End Sub

Private Function NormaliseerDistrictPeriode(ByVal v As Variant) As String
    If IsDate(v) Then
        NormaliseerDistrictPeriode = Format(CDate(v), "yyyy-mm")
    Else
        NormaliseerDistrictPeriode = Left$(Trim(CStr(v)), 7)
    End If
End Function


Private Function DistrictActiveCount(ByVal tbl As ListObject) As Long
    Dim r As ListRow
    Dim shopNr As String
    Dim actief As String

    For Each r In tbl.ListRows
        shopNr = Trim(CStr(r.Range.Cells(1, tbl.ListColumns("ShopNr").Index).value))
        actief = LCase(Trim(CStr(r.Range.Cells(1, tbl.ListColumns("Actief").Index).value)))

        If shopNr <> "" And actief <> "nee" And actief <> "no" And actief <> "0" And _
           actief <> "false" And actief <> "inactief" Then
            DistrictActiveCount = DistrictActiveCount + 1
        End If
    Next r
End Function

Private Function BepaalDistrictPeriode() As String
    If Day(Date) = 1 Then
        BepaalDistrictPeriode = Format(DateAdd("m", -1, Date), "yyyy-mm")
    Else
        BepaalDistrictPeriode = Format(Date, "yyyy-mm")
    End If
End Function

Private Function DistrictWinkelOmzet(ByVal shopNr As String) As Double
    Dim ws As Worksheet, i As Long, lastRow As Long
    Set ws = ThisWorkbook.Worksheets("I_Sales")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DistrictShopKey(ws.Cells(i, 1).value) = DistrictShopKey(shopNr) And LCase(Trim(CStr(ws.Cells(i, 2).value))) = "total yr" Then
            DistrictWinkelOmzet = NumDistrict(ws.Cells(i, 21).value)
            Exit Function
        End If
    Next i
End Function

Private Function DistrictShopWaarde(ByVal sheetName As String, ByVal shopNr As String, ByVal colNr As Long) As Double
    Dim ws As Worksheet, i As Long, lastRow As Long
    Set ws = ThisWorkbook.Worksheets(sheetName)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DistrictShopKey(ws.Cells(i, 1).value) = DistrictShopKey(shopNr) Then
            DistrictShopWaarde = NumDistrict(ws.Cells(i, colNr).value)
            Exit Function
        End If
    Next i
End Function

Private Function DistrictZoekShop(ByVal sheetName As String, ByVal shopNr As String, ByVal colNr As Long) As Double
    Dim ws As Worksheet, i As Long, lastRow As Long, b As String
    Set ws = ThisWorkbook.Worksheets(sheetName)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DistrictShopKey(ws.Cells(i, 1).value) = DistrictShopKey(shopNr) Then
            b = LCase(Trim(CStr(ws.Cells(i, 2).value)))
            If InStr(b, "total") > 0 Or InStr(b, "all groups") > 0 Or InStr(b, "shop") > 0 Then
                DistrictZoekShop = NumDistrict(ws.Cells(i, colNr).value)
                Exit Function
            End If
        End If
    Next i
End Function

Private Function DistrictRDI(ByVal shopNr As String, ByVal colNr As Long) As Double
    DistrictRDI = DistrictZoekShop("I_RDI", shopNr, colNr)
End Function

Private Function DistrictAccessoires(ByVal shopNr As String) As Double
    DistrictAccessoires = DistrictIAccShop(shopNr, "total sales access", 8)
End Function

Private Function DistrictMonster(ByVal shopNr As String) As Double
    On Error Resume Next
    DistrictMonster = DistrictIAccShop(shopNr, "total sales monster", 8)
    If DistrictMonster = 0 Then DistrictMonster = DistrictIAccShop(shopNr, "total sales monster", 7)
End Function

Private Function DistrictIAccShop(ByVal shopNr As String, ByVal labelContains As String, ByVal colNr As Long) As Double
    Dim ws As Worksheet, i As Long, lastRow As Long, label As String
    Set ws = ThisWorkbook.Worksheets("I_Acc")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DistrictShopKey(ws.Cells(i, 2).value) = DistrictShopKey(shopNr) Then
            label = LCase(CStr(ws.Cells(i, 3).value))
            If InStr(label, labelContains) > 0 And InStr(label, "total shop") > 0 Then
                DistrictIAccShop = DistrictIAccShop + NumDistrict(ws.Cells(i, colNr).value)
            End If
        End If
    Next i
End Function

Private Function DistrictLinkShop(ByVal shopNr As String) As Double
    Dim ws As Worksheet, i As Long, lastRow As Long
    Set ws = ThisWorkbook.Worksheets("I_LinkShop")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DistrictShopKey(ws.Cells(i, 1).value) = DistrictShopKey(shopNr) And InStr(LCase(CStr(ws.Cells(i, 2).value)), "total shop") > 0 Then
            DistrictLinkShop = NumDistrict(ws.Cells(i, 7).value)
            Exit Function
        End If
    Next i
End Function

Private Function DistrictLaatsteStuksPct(ByVal shopNr As String) As Double
    Dim ws As Worksheet, i As Long, lastRow As Long, label As String
    Set ws = ThisWorkbook.Worksheets("I_S")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DistrictShopKey(ws.Cells(i, 1).value) = DistrictShopKey(shopNr) Then
            label = LCase(CStr(ws.Cells(i, 2).value))
            If InStr(label, "total") > 0 Or InStr(label, "all groups") > 0 Then
                DistrictLaatsteStuksPct = DistrictPct(ws.Cells(i, 9).value)
                Exit Function
            End If
        End If
    Next i
End Function

Private Function DistrictPct(ByVal v As Variant) As Double
    DistrictPct = NumDistrict(v)
    If Abs(DistrictPct) > 0 And Abs(DistrictPct) <= 1 Then DistrictPct = DistrictPct * 100
End Function


Private Function DistrictShopKey(ByVal v As Variant) As String
    DistrictShopKey = DiestroyersShopKey(v)
End Function

Private Function NumDistrict(ByVal v As Variant) As Double
    NumDistrict = DiestroyersNumber(v)
End Function

Private Sub ZetDistrict(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal colName As String, ByVal v As Variant)
    On Error Resume Next
    If LCase$(colName) = "shopnr" Then rr.Range.Cells(1, tbl.ListColumns(colName).Index).NumberFormat = "@"
    rr.Range.Cells(1, tbl.ListColumns(colName).Index).Value = v
End Sub

Private Function CellDistrict(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal colName As String) As String
    On Error GoTo Fout
    CellDistrict = CStr(rr.Range.Cells(1, tbl.ListColumns(colName).Index).value)
    Exit Function
Fout:
    CellDistrict = ""
End Function

Private Function CellSafe(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal colName As String) As Variant
    On Error GoTo Fout
    CellSafe = rr.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
Fout:
    CellSafe = ""
End Function

Private Function DistrictNumFields(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal cols As Variant) As String
    Dim i As Long, s As String
    For i = LBound(cols) To UBound(cols)
        s = s & ",""" & CStr(cols(i)) & """:" & Replace(CStr(NumDistrict(CellSafe(tbl, rr, CStr(cols(i))))), ",", ".")
    Next i
    DistrictNumFields = s
End Function

Private Function JSDistrict(ByVal s As String) As String
    s = Replace(s, "\", "\\")
    s = Replace(s, """", "\""")
    JSDistrict = s
End Function

Private Sub WriteDistrictFile(ByVal filePath As String, ByVal content As String)
    LocalWriteUtf8File filePath, content
End Sub

Private Function GetOrCreateSheetDistrict(ByVal sheetName As String) As Worksheet
    On Error Resume Next
    Set GetOrCreateSheetDistrict = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    If GetOrCreateSheetDistrict Is Nothing Then
        Set GetOrCreateSheetDistrict = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        GetOrCreateSheetDistrict.name = sheetName
    End If
End Function
