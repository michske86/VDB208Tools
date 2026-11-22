Attribute VB_Name = "GisterenServiceExport"
Option Explicit

' Bewaart de MTD-stand vóór de dagstart en publiceert na de import het verschil.
Private Const SNAPSHOT_SHEET As String = "_GisterenServiceSnapshot"
Private Const FIRST_DATA_ROW As Long = 2

Public Sub NeemGisterenServiceSnapshot()
    Dim ws As Worksheet, tbl As ListObject, r As ListRow
    Dim periode As String, nextRow As Long
    periode = GisterenResultatenPeriode()
    Set ws = GetSnapshotSheet()
    Set tbl = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")

    ws.Visible = xlSheetVisible
    ws.Cells.Clear
    ws.Range("A1:L1").Value = Array("PersoneelsNr", "Naam", "Periode", "Omzet", "Life", "Insurance", "Abo", "DSP", "SPG", "SRP", "SnapshotAt", "ServiceDatum")
    nextRow = FIRST_DATA_ROW
    For Each r In tbl.ListRows
        If IsSellerForPeriod(tbl, r, periode) Then
            ws.Cells(nextRow, 1).Value = Txt(tbl, r, "PersoneelsNr")
            ws.Cells(nextRow, 2).Value = Txt(tbl, r, "Naam")
            ws.Cells(nextRow, 3).Value = periode
            ws.Cells(nextRow, 4).Value = Num(tbl, r, "Omzet")
            ws.Cells(nextRow, 5).Value = Num(tbl, r, "Life")
            ws.Cells(nextRow, 6).Value = Num(tbl, r, "InsuranceStuks")
            ws.Cells(nextRow, 7).Value = Num(tbl, r, "AboStuks")
            ws.Cells(nextRow, 8).Value = Num(tbl, r, "DSPStuks")
            ws.Cells(nextRow, 9).Value = Num(tbl, r, "SPGStuks")
            ws.Cells(nextRow, 10).Value = Num(tbl, r, "SRPStuks")
            ws.Cells(nextRow, 11).Value = Now
            ws.Cells(nextRow, 12).Value = DateAdd("d", -1, Date)
            nextRow = nextRow + 1
        End If
    Next r
    ThisWorkbook.Worksheets("Diestroyers Dashboard").Activate
    ws.Visible = xlSheetVeryHidden
End Sub

Public Sub PubliceerGisterenServiceData()
    Dim ws As Worksheet, tbl As ListObject, currentRow As ListRow
    Dim periode As String, lastRow As Long, i As Long
    Dim hasSnapshot As Boolean, firstItem As Boolean
    Dim sellerId As String, sellerName As String, sellersJson As String
    On Error GoTo Fout
    Set ws = GetSnapshotSheet()
    Set tbl = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    periode = GisterenResultatenPeriode()
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    hasSnapshot = lastRow >= FIRST_DATA_ROW And TxtValue(ws.Cells(1, 4).Value) = "Omzet" And TxtValue(ws.Cells(FIRST_DATA_ROW, 3).Value) = periode
    sellersJson = "[": firstItem = True
    If hasSnapshot Then
        For i = FIRST_DATA_ROW To lastRow
            sellerId = TxtValue(ws.Cells(i, 1).Value)
            sellerName = TxtValue(ws.Cells(i, 2).Value)
            Set currentRow = FindSeller(tbl, periode, sellerId, sellerName)
            If Not currentRow Is Nothing Then
                If Not firstItem Then sellersJson = sellersJson & ","
                firstItem = False
                sellersJson = sellersJson & ItemJson(tbl, currentRow, sellerId, sellerName, ws, i)
            End If
        Next i
    End If
    sellersJson = sellersJson & "]"
    ' Alleen een nieuwe export schrijven wanneer er effectief verkopers zijn gematcht.
    ' Een gewone website-update zonder nieuwe dagstart mag de laatste geldige dagdata
    ' dus nooit terug overschrijven met een lege Gisteren-slide.
    If Not firstItem Then
        LocalWriteUtf8File LocalAssetsFile("gisteren-service-data.js"), BuildPayload(True, periode, ws, sellersJson)
    Else
        BehoudLaatsteGisterenData
    End If
    Exit Sub
Fout:
    BehoudLaatsteGisterenData
End Sub

Private Sub BehoudLaatsteGisterenData()
    Dim pad As String, bestaandeData As String
    On Error GoTo SchrijfLeeg
    pad = LocalAssetsFile("gisteren-service-data.js")
    If LocalFileExists(pad) Then
        bestaandeData = LocalReadUtf8File(pad)
        If InStr(1, bestaandeData, """available"":true", vbTextCompare) > 0 Then Exit Sub
    End If
SchrijfLeeg:
    LocalWriteUtf8File LocalAssetsFile("gisteren-service-data.js"), EmptyPayload()
End Sub

Private Function BuildPayload(ByVal available As Boolean, ByVal periode As String, ByVal ws As Worksheet, ByVal sellersJson As String) As String
    Dim datum As String
    If available Then datum = Format$(CDate(ws.Cells(FIRST_DATA_ROW, 12).Value), "yyyy-mm-dd")
    BuildPayload = "window.DIESTROYERS_GISTEREN_SERVICE = {" & _
        JsonPair("available", LCase$(CStr(available))) & "," & _
        JsonPair("periode", JsonString(periode)) & "," & _
        JsonPair("datum", JsonString(datum)) & "," & _
        JsonPair("sellers", sellersJson) & "," & _
        JsonPair("generatedAt", JsonString(Format$(Now, "yyyy-mm-dd hh:nn:ss"))) & "};"
End Function

Private Function EmptyPayload() As String
    EmptyPayload = "window.DIESTROYERS_GISTEREN_SERVICE = {" & _
        JsonPair("available", "false") & "," & _
        JsonPair("periode", JsonString("")) & "," & _
        JsonPair("datum", JsonString("")) & "," & _
        JsonPair("sellers", "[]") & "," & _
        JsonPair("generatedAt", JsonString("")) & "};"
End Function

Private Function ItemJson(ByVal tbl As ListObject, ByVal r As ListRow, ByVal sellerId As String, ByVal sellerName As String, ByVal ws As Worksheet, ByVal snapshotRow As Long) As String
    Dim omzet As Double, life As Double, insurance As Double
    Dim abo As Double, dsp As Double, spg As Double, srp As Double

    omzet = Diff(Num(tbl, r, "Omzet"), ws.Cells(snapshotRow, 4).Value)
    life = Diff(Num(tbl, r, "Life"), ws.Cells(snapshotRow, 5).Value)
    insurance = Diff(Num(tbl, r, "InsuranceStuks"), ws.Cells(snapshotRow, 6).Value)
    abo = Diff(Num(tbl, r, "AboStuks"), ws.Cells(snapshotRow, 7).Value)
    dsp = Diff(Num(tbl, r, "DSPStuks"), ws.Cells(snapshotRow, 8).Value)
    spg = Diff(Num(tbl, r, "SPGStuks"), ws.Cells(snapshotRow, 9).Value)
    srp = Diff(Num(tbl, r, "SRPStuks"), ws.Cells(snapshotRow, 10).Value)

    ItemJson = "{" & _
        JsonPair("id", JsonString(sellerId)) & "," & _
        JsonPair("naam", JsonString(sellerName)) & "," & _
        JsonPair("omzet", JsonNum(omzet)) & "," & _
        JsonPair("life", JsonNum(life)) & "," & _
        JsonPair("insurance", JsonNum(insurance)) & "," & _
        JsonPair("abo", JsonNum(abo)) & "," & _
        JsonPair("dsp", JsonNum(dsp)) & "," & _
        JsonPair("spg", JsonNum(spg)) & "," & _
        JsonPair("srp", JsonNum(srp)) & "}"
End Function

Private Function GetSnapshotSheet() As Worksheet
    On Error Resume Next
    Set GetSnapshotSheet = ThisWorkbook.Worksheets(SNAPSHOT_SHEET)
    On Error GoTo 0
    If GetSnapshotSheet Is Nothing Then
        Set GetSnapshotSheet = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        GetSnapshotSheet.Name = SNAPSHOT_SHEET
    End If
End Function

Private Function GisterenResultatenPeriode() As String
    If Day(Date) = 1 Then GisterenResultatenPeriode = Format$(DateAdd("m", -1, Date), "yyyy-mm") Else GisterenResultatenPeriode = Format$(Date, "yyyy-mm")
End Function

Private Function IsSellerForPeriod(ByVal tbl As ListObject, ByVal r As ListRow, ByVal periode As String) As Boolean
    IsSellerForPeriod = LCase$(Txt(tbl, r, "EntiteitType")) = "verkoper" And Left$(Txt(tbl, r, "Periode"), 7) = periode
End Function

Private Function FindSeller(ByVal tbl As ListObject, ByVal periode As String, ByVal sellerId As String, ByVal sellerName As String) As ListRow
    Dim r As ListRow
    For Each r In tbl.ListRows
        If IsSellerForPeriod(tbl, r, periode) Then
            If (sellerId <> "" And Txt(tbl, r, "PersoneelsNr") = sellerId) Or (sellerId = "" And LCase$(Txt(tbl, r, "Naam")) = LCase$(sellerName)) Then Set FindSeller = r: Exit Function
        End If
    Next r
End Function

Private Function Txt(ByVal tbl As ListObject, ByVal r As ListRow, ByVal columnName As String) As String
    On Error GoTo Missing
    Txt = TxtValue(r.Range.Cells(1, tbl.ListColumns(columnName).Index).Value)
    Exit Function
Missing:
    Txt = ""
End Function

Private Function TxtValue(ByVal value As Variant) As String
    If Not IsError(value) And Not IsNull(value) Then TxtValue = Trim$(CStr(value))
End Function

Private Function Num(ByVal tbl As ListObject, ByVal r As ListRow, ByVal columnName As String) As Double
    On Error GoTo Missing
    If IsNumeric(r.Range.Cells(1, tbl.ListColumns(columnName).Index).Value) Then Num = CDbl(r.Range.Cells(1, tbl.ListColumns(columnName).Index).Value)
    Exit Function
Missing:
    Num = 0
End Function

Private Function Diff(ByVal currentValue As Double, ByVal previousValue As Variant) As Double
    If IsNumeric(previousValue) Then Diff = Application.Max(0, currentValue - CDbl(previousValue)) Else Diff = Application.Max(0, currentValue)
End Function

Private Function JsonPair(ByVal key As String, ByVal valueJson As String) As String
    JsonPair = JsonString(key) & ":" & valueJson
End Function

Private Function JsonString(ByVal value As String) As String
    JsonString = Q() & JsonEscape(value) & Q()
End Function

Private Function JsonEscape(ByVal value As String) As String
    Dim slash As String
    slash = Chr$(92)
    JsonEscape = Replace$(value, slash, slash & slash)
    JsonEscape = Replace$(JsonEscape, Q(), slash & Q())
    JsonEscape = Replace$(JsonEscape, vbCrLf, slash & "n")
    JsonEscape = Replace$(JsonEscape, vbCr, slash & "n")
    JsonEscape = Replace$(JsonEscape, vbLf, slash & "n")
End Function

Private Function JsonNum(ByVal value As Double) As String
    JsonNum = Replace$(Format$(value, "0.############"), ",", ".")
End Function

Private Function Q() As String
    Q = Chr$(34)
End Function
