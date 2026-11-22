Attribute VB_Name = "AkteVanVertrouwenExport"
Option Explicit

' ============================================================
' THE DIESTROYERS - AKTE VAN VERTROUWEN TV-EXPORT
' Bouwt assets\avv-data.js uit de verrijkte NPS_Data-tabel.
' Ja/Nee: alleen Ja telt positief; leeg telt als Nee.
' Scores 1-5: gemiddelde / 5 * 100; lege scores tellen niet mee.
' ============================================================

Public Sub PubliceerAkteVanVertrouwen()
    ' AVV is aanvullende TV-informatie. Een onverwachte bronwaarde mag
    ' de volledige website-publicatie nooit blokkeren.
    On Error GoTo VeiligeFallback

    Dim tbl As ListObject: Set tbl = AvvFindTable()
    If tbl Is Nothing Then Err.Raise vbObjectError + 7840, , "NPS_Data-tabel ontbreekt."

    Dim latestPeriod As String, row As ListRow, p As String
    For Each row In tbl.ListRows
        p = AvvText(AvvCell(tbl, row, "Periode"))
        If p > latestPeriod Then latestPeriod = p
    Next row
    If latestPeriod = "" Then Err.Raise vbObjectError + 7841, , "NPS_Data bevat geen periodes."

    Dim storeMonth As Object, storeYtd As Object, sellerMonth As Object, sellerYtd As Object, sellerNames As Object
    Set storeMonth = AvvNewStats()
    Set storeYtd = AvvNewStats()
    Set sellerMonth = CreateObject("Scripting.Dictionary")
    Set sellerYtd = CreateObject("Scripting.Dictionary")
    Set sellerNames = CreateObject("Scripting.Dictionary")

    Dim sid As String, name As String, includeYtd As Boolean
    For Each row In tbl.ListRows
        p = AvvText(AvvCell(tbl, row, "Periode"))
        sid = Trim$(AvvText(AvvCell(tbl, row, "PersoneelsNr")))
        name = Trim$(AvvText(AvvCell(tbl, row, "Verkoper")))
        includeYtd = (Left$(p, 4) = Left$(latestPeriod, 4) And p <= latestPeriod)

        If p = latestPeriod Then
            AvvAddRow storeMonth, tbl, row
            If sid <> "" And name <> "" Then
                AvvAddRow AvvSellerStats(sellerMonth, sid), tbl, row
                sellerNames(sid) = name
            End If
        End If
        If includeYtd Then
            AvvAddRow storeYtd, tbl, row
            If sid <> "" And name <> "" Then
                AvvAddRow AvvSellerStats(sellerYtd, sid), tbl, row
                sellerNames(sid) = name
            End If
        End If
    Next row

    Dim json As String
    json = "{""generatedAt"":""" & Format$(Now, "yyyy-mm-dd\Thh:nn:ss") & """,""latestPeriod"":""" & latestPeriod & ""","
    json = json & """store"":{""month"":" & AvvStatsJson(storeMonth) & ",""ytd"":" & AvvStatsJson(storeYtd) & "},"
    json = json & """sellers"":" & AvvSellersJson(sellerNames, sellerMonth, sellerYtd) & "}"
    AvvWriteUtf8 LocalProjectPath() & "\assets\avv-data.js", "window.DIESTROYERS_AVV = " & json & ";" & vbCrLf
    Exit Sub
VeiligeFallback:
    On Error Resume Next
    AvvWriteUtf8 LocalProjectPath() & "\assets\avv-data.js", AvvLegeDataJs()
    On Error GoTo 0
End Sub

Private Function AvvLegeDataJs() As String
    Dim q As String
    q = Chr$(34)
    AvvLegeDataJs = "window.DIESTROYERS_AVV = {" & _
        q & "generatedAt" & q & ":" & q & Format$(Now, "yyyy-mm-dd\Thh:nn:ss") & q & "," & _
        q & "latestPeriod" & q & ":" & q & q & "," & _
        q & "store" & q & ":{" & q & "month" & q & ":{}," & q & "ytd" & q & ":{}}," & _
        q & "sellers" & q & ":{}};" & vbCrLf
End Function

Private Function AvvFindTable() As ListObject
    Dim ws As Worksheet
    On Error Resume Next
    For Each ws In ThisWorkbook.Worksheets
        Set AvvFindTable = ws.ListObjects("NPS_Data")
        If Not AvvFindTable Is Nothing Then Exit Function
    Next ws
    On Error GoTo 0
End Function

Private Function AvvCell(ByVal tbl As ListObject, ByVal row As ListRow, ByVal columnName As String) As Variant
    On Error Resume Next
    AvvCell = row.Range.Cells(1, tbl.ListColumns(columnName).Index).Value
    On Error GoTo 0
End Function

Private Function AvvText(ByVal value As Variant) As String
    On Error GoTo GeenTekst
    If IsError(value) Or IsNull(value) Or IsEmpty(value) Then Exit Function
    AvvText = CStr(value)
    Exit Function
GeenTekst:
    AvvText = ""
End Function

Private Function AvvNewStats() As Object
    Dim d As Object: Set d = CreateObject("Scripting.Dictionary")
    d.Add "trustYes", 0: d.Add "trustTotal", 0
    d.Add "priceYes", 0: d.Add "priceTotal", 0
    d.Add "informationSum", 0#: d.Add "informationCount", 0
    d.Add "waitSum", 0#: d.Add "waitCount", 0
    d.Add "friendlySum", 0#: d.Add "friendlyCount", 0
    Set AvvNewStats = d
End Function

Private Function AvvSellerStats(ByVal allStats As Object, ByVal sellerId As String) As Object
    Dim stats As Object
    If Not allStats.Exists(sellerId) Then
        Set stats = AvvNewStats()
        allStats.Add sellerId, stats
    End If
    Set AvvSellerStats = allStats(sellerId)
End Function

Private Sub AvvAddRow(ByVal stats As Object, ByVal tbl As ListObject, ByVal row As ListRow)
    stats("trustTotal") = CLng(stats("trustTotal")) + 1
    If AvvIsYes(AvvText(AvvCell(tbl, row, "AkteVertrouwen"))) Then stats("trustYes") = CLng(stats("trustYes")) + 1
    stats("priceTotal") = CLng(stats("priceTotal")) + 1
    If AvvIsYes(AvvText(AvvCell(tbl, row, "LaagstePrijsGarantie"))) Then stats("priceYes") = CLng(stats("priceYes")) + 1
    AvvAddScore stats, "information", AvvCell(tbl, row, "InlichtingenScore")
    AvvAddScore stats, "wait", AvvCell(tbl, row, "WachttijdScore")
    AvvAddScore stats, "friendly", AvvCell(tbl, row, "VriendelijkheidScore")
End Sub

Private Function AvvIsYes(ByVal answer As String) As Boolean
    answer = LCase$(Trim$(answer))
    AvvIsYes = (answer = "ja" Or answer = "oui" Or answer = "yes")
End Function

Private Sub AvvAddScore(ByVal stats As Object, ByVal metric As String, ByVal rawValue As Variant)
    Dim score As Double
    If Not IsError(rawValue) And Not IsNull(rawValue) And IsNumeric(rawValue) Then
        score = CDbl(rawValue)
        If score >= 1 And score <= 5 Then
            stats(metric & "Sum") = CDbl(stats(metric & "Sum")) + score
            stats(metric & "Count") = CLng(stats(metric & "Count")) + 1
        End If
    End If
End Sub

Private Function AvvPctJson(ByVal positives As Long, ByVal total As Long) As String
    If total = 0 Then
        AvvPctJson = "{""value"":null,""responses"":0}"
    Else
        AvvPctJson = "{""value"":" & AvvNumber(positives / total * 100) & ",""responses"":" & total & "}"
    End If
End Function

Private Function AvvScoreJson(ByVal totalScore As Double, ByVal totalResponses As Long) As String
    If totalResponses = 0 Then
        AvvScoreJson = "{""value"":null,""responses"":0}"
    Else
        AvvScoreJson = "{""value"":" & AvvNumber(totalScore / totalResponses / 5 * 100) & ",""responses"":" & totalResponses & "}"
    End If
End Function

Private Function AvvNumber(ByVal value As Double) As String
    AvvNumber = Replace$(CStr(Round(value, 1)), ",", ".")
End Function

Private Function AvvStatsJson(ByVal stats As Object) As String
    AvvStatsJson = "{""trust"":" & AvvPctJson(stats("trustYes"), stats("trustTotal")) & ","
    AvvStatsJson = AvvStatsJson & """price"":" & AvvPctJson(stats("priceYes"), stats("priceTotal")) & ","
    AvvStatsJson = AvvStatsJson & """information"":" & AvvScoreJson(stats("informationSum"), stats("informationCount")) & ","
    AvvStatsJson = AvvStatsJson & """wait"":" & AvvScoreJson(stats("waitSum"), stats("waitCount")) & ","
    AvvStatsJson = AvvStatsJson & """friendly"":" & AvvScoreJson(stats("friendlySum"), stats("friendlyCount")) & "}"
End Function

Private Function AvvSellersJson(ByVal sellerNames As Object, ByVal sellerMonth As Object, ByVal sellerYtd As Object) As String
    Dim sid As Variant, first As Boolean, m As Object, y As Object, name As String
    first = True: AvvSellersJson = "{"
    For Each sid In sellerNames.Keys
        If Not first Then AvvSellersJson = AvvSellersJson & ","
        first = False
        Set m = AvvSellerStats(sellerMonth, CStr(sid))
        Set y = AvvSellerStats(sellerYtd, CStr(sid))
        name = CStr(sellerNames(sid))
        AvvSellersJson = AvvSellersJson & """" & CStr(sid) & """:{""name"":""" & name & """,""month"":" & AvvStatsJson(m) & ",""ytd"":" & AvvStatsJson(y) & "}"
    Next sid
    AvvSellersJson = AvvSellersJson & "}"
End Function

Private Sub AvvWriteUtf8(ByVal path As String, ByVal text As String)
    ' Gebruik de centrale, lockbestendige schrijver voor de OneDrive-map.
    LocalWriteUtf8File path, text
End Sub
