Attribute VB_Name = "NPSImport"
Option Explicit

' ============================================================
' THE DIESTROYERS - NPS IMPORT & PUBLICATIE
' Bron: assets\NPS-Export.csv
' Datum: Date de fin [Survey A _MAD_Shop] (+02:00 GMT)
' Score: NPS [Survey A _MAD_Shop]
' Verkoper: SellerBips [Survey A _MAD_Shop] = PersoneelsNr
' Commentaar: Verbatim - Pouvez-vous commenter cette note en quelques mots ? [Survey A _MAD_Shop]
'
' Iedere uitvoering bouwt NPS_Data en NPS_Controle volledig opnieuw op.
' Enquêtes zonder geldige verkoperskoppeling tellen altijd mee voor de winkel.
' ============================================================

Private Const COL_DATE As String = "Date de fin [Survey A _MAD_Shop] (+02:00 GMT)"
Private Const COL_SCORE As String = "NPS [Survey A _MAD_Shop]"
Private Const COL_SELLER As String = "SellerBips [Survey A _MAD_Shop]"
Private Const COL_COMMENT As String = "Verbatim - Pouvez-vous commenter cette note en quelques mots ? [Survey A _MAD_Shop]"
Private Const COL_TRUST As String = "S-Contrat confiance - Vous a-t-on parlé du Contrat de Confiance ? [Survey A _MAD_Shop]"
Private Const COL_LOWEST_PRICE As String = "S-EDLP - Vous a-t-on parlé de la garantie du prix le plus bas ? [Survey A _MAD_Shop]"
Private Const COL_WAIT As String = "S-matrice Shop/TS_1 - le temps d'attente avant d'être aidé [Survey A _MAD_Shop]"
Private Const COL_FRIENDLY As String = "S-matrice Shop/TS_2 - l'amabilité de votre interlocuteur [Survey A _MAD_Shop]"
Private Const COL_INFORMATION As String = "S-matrice Shop/TS_3 - les conseils de nos experts (explication claire et pertinente) [Survey A _MAD_Shop]"

Public Sub ImporteerEnPubliceerNPS()
    On Error GoTo Fout
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Dim currentStep As String

    Dim projectPath As String
    Dim csvPath As String
    projectPath = LocalProjectPath()
    If Len(projectPath) = 0 Then Err.Raise vbObjectError + 709, , "De lokale Diestroyers-projectmap kon niet worden bepaald."
    csvPath = projectPath & "\assets\NPS-Export.csv"
    If Dir(csvPath) = "" Then Err.Raise vbObjectError + 710, , "NPS-Export.csv ontbreekt in de assets-map."

    Dim csvText As String
    currentStep = "NPS-bronbestand lezen"
    csvText = ReadUtf8FileNPS(csvPath)
    If Len(csvText) = 0 Then Err.Raise vbObjectError + 711, , "NPS-Export.csv is leeg."

    Dim parsed As Collection
    currentStep = "NPS-bronbestand verwerken"
    Set parsed = ParseCsvNPS(csvText)
    If parsed.Count < 2 Then Err.Raise vbObjectError + 712, , "Geen bruikbare CSV-rijen gevonden."

    Dim headers As Variant
    headers = parsed(1)

    Dim iDate As Long, iScore As Long, iSeller As Long, iComment As Long
    Dim iTrust As Long, iLowestPrice As Long, iWait As Long, iFriendly As Long, iInformation As Long
    iDate = HeaderIndexNPS(headers, COL_DATE)
    iScore = HeaderIndexNPS(headers, COL_SCORE)
    iSeller = HeaderIndexNPS(headers, COL_SELLER)
    iComment = HeaderIndexNPS(headers, COL_COMMENT)
    iTrust = HeaderIndexNPS(headers, COL_TRUST)
    iLowestPrice = HeaderIndexNPS(headers, COL_LOWEST_PRICE)
    iWait = HeaderIndexNPS(headers, COL_WAIT)
    iFriendly = HeaderIndexNPS(headers, COL_FRIENDLY)
    iInformation = HeaderIndexNPS(headers, COL_INFORMATION)
    If iDate < 0 Or iScore < 0 Or iSeller < 0 Or iComment < 0 Or iTrust < 0 Or iLowestPrice < 0 Or iWait < 0 Or iFriendly < 0 Or iInformation < 0 Then
        Err.Raise vbObjectError + 713, , "Een of meer verplichte NPS-kolommen ontbreken."
    End If

    Dim sellerNames As Object, sellerActive As Object
    Set sellerNames = CreateObject("Scripting.Dictionary")
    Set sellerActive = CreateObject("Scripting.Dictionary")
    LoadSellerMapNPS sellerNames, sellerActive

    Dim wsData As Worksheet, tblData As ListObject
    currentStep = "NPS_Data voorbereiden"
    Set wsData = GetOrCreateSheetNPS("NPS_Data")
    Set tblData = EnsureTableNPS(wsData, "NPS_Data", Array("RecordId", "Datum", "Periode", "Jaar", "Score", "Type", "SellerBips", "PersoneelsNr", "Verkoper", "Actief", "Koppelstatus", "Commentaar", "AkteVertrouwen", "LaagstePrijsGarantie", "WachttijdScore", "VriendelijkheidScore", "InlichtingenScore"))
    ClearTableNPS tblData

    Dim validRows As Long, invalidRows As Long, linkedRows As Long
    Dim noSellerRows As Long, unknownRows As Long, commentRows As Long
    Dim unknownIds As Object: Set unknownIds = CreateObject("Scripting.Dictionary")

    Dim r As Long, fields As Variant, d As Date, score As Long
    Dim rawSeller As String, sid As String, sellerName As String, linkStatus As String
    Dim comment As String, lr As ListRow, recordId As String

    currentStep = "NPS-antwoorden inlezen"
    For r = 2 To parsed.Count
        fields = parsed(r)
        If TryParseDateNPS(FieldNPS(fields, iDate), d) And TryParseScoreNPS(FieldNPS(fields, iScore), score) Then
            rawSeller = FieldNPS(fields, iSeller)
            sid = ExtractSellerBipsNPS(rawSeller)
            sellerName = ""
            If sid = "" Then
                linkStatus = "Geen SellerBips"
                noSellerRows = noSellerRows + 1
            ElseIf sellerNames.Exists(sid) Then
                linkStatus = "Gekoppeld"
                sellerName = CStr(sellerNames(sid))
                linkedRows = linkedRows + 1
            Else
                linkStatus = "Onbekende SellerBips"
                unknownRows = unknownRows + 1
                If Not unknownIds.Exists(sid) Then unknownIds.Add sid, True
            End If

            comment = Trim$(FieldNPS(fields, iComment))
            If comment <> "" Then commentRows = commentRows + 1
            recordId = "NPS-" & Format$(d, "yyyymmdd-hhnnss") & "-" & Format$(r, "000000")

            Set lr = tblData.ListRows.Add
            SetCellNPS tblData, lr, "RecordId", recordId
            SetCellNPS tblData, lr, "Datum", d
            SetCellNPS tblData, lr, "Periode", Format$(d, "yyyy-mm")
            SetCellNPS tblData, lr, "Jaar", Year(d)
            SetCellNPS tblData, lr, "Score", score
            SetCellNPS tblData, lr, "Type", NpsTypeNPS(score)
            SetCellNPS tblData, lr, "SellerBips", sid
            SetCellNPS tblData, lr, "PersoneelsNr", sid
            SetCellNPS tblData, lr, "Verkoper", sellerName
            If sellerNames.Exists(sid) Then SetCellNPS tblData, lr, "Actief", IIf(CBool(sellerActive(sid)), "Ja", "Nee")
            SetCellNPS tblData, lr, "Koppelstatus", linkStatus
            SetCellNPS tblData, lr, "Commentaar", comment
            SetCellNPS tblData, lr, "AkteVertrouwen", FieldNPS(fields, iTrust)
            SetCellNPS tblData, lr, "LaagstePrijsGarantie", FieldNPS(fields, iLowestPrice)
            SetCellNPS tblData, lr, "WachttijdScore", FieldNPS(fields, iWait)
            SetCellNPS tblData, lr, "VriendelijkheidScore", FieldNPS(fields, iFriendly)
            SetCellNPS tblData, lr, "InlichtingenScore", FieldNPS(fields, iInformation)
            validRows = validRows + 1
        Else
            invalidRows = invalidRows + 1
        End If
    Next r

    currentStep = "NPS-overzicht opmaken"
    FormatDataSheetNPS wsData, tblData
    ' Deze twee overzichten zijn aanvullend. Een beschadigde oude resultaat- of
    ' controletabel mag de actuele NPS/TV-publicatie niet tegenhouden.
    UpdateResultatenNPSSafe tblData
    BuildControlNPSSafe parsed.Count - 1, validRows, invalidRows, linkedRows, noSellerRows, unknownRows, commentRows, unknownIds
    currentStep = "NPS-websitegegevens publiceren"
    ExportNpsDataJsNPS tblData, sellerNames, sellerActive
    currentStep = "Akte Van Vertrouwen publiceren"

    ' AVV is extra TV-informatie. De NPS-publicatie is hierboven al geslaagd;
    ' een ongeldige AVV-bronwaarde mag de volledige website-update niet stoppen.
    On Error Resume Next
    PubliceerAkteVanVertrouwen
    On Error GoTo Fout

    ActiveerDashboardNaNPS
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Exit Sub
Fout:
    ActiveerDashboardNaNPS
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Err.Raise Err.Number, "ImporteerEnPubliceerNPS - " & currentStep, Err.Description
End Sub

Private Sub UpdateResultatenNPSSafe(ByVal tblData As ListObject)
    On Error Resume Next
    UpdateResultatenNPS tblData
    On Error GoTo 0
End Sub

Private Sub BuildControlNPSSafe(ByVal sourceRows As Long, ByVal validRows As Long, ByVal invalidRows As Long, ByVal linkedRows As Long, ByVal noSellerRows As Long, ByVal unknownRows As Long, ByVal commentRows As Long, ByVal unknownIds As Object)
    On Error Resume Next
    BuildControlNPS sourceRows, validRows, invalidRows, linkedRows, noSellerRows, unknownRows, commentRows, unknownIds
    On Error GoTo 0
End Sub

Private Sub ActiveerDashboardNaNPS()
    On Error Resume Next
    ThisWorkbook.Worksheets("Dashboard").Activate
    On Error GoTo 0
End Sub

Public Sub ImporteerNPSMetMelding()
    On Error GoTo Fout
    ImporteerEnPubliceerNPS
    MsgBox "NPS volledig opnieuw opgebouwd en gepubliceerd.", vbInformation, "The Diestroyers"
    Exit Sub
Fout:
    MsgBox "NPS verwerken mislukt: " & Err.Description, vbCritical, "The Diestroyers"
End Sub

Private Sub UpdateResultatenNPS(ByVal tblData As ListObject)
    Dim tblRes As ListObject
    Set tblRes = FindTableNPS("Resultaten")
    If tblRes Is Nothing Then Exit Sub

    Dim periods As Object: Set periods = CreateObject("Scripting.Dictionary")
    Dim row As ListRow, p As String
    For Each row In tblData.ListRows
        p = CStr(GetCellNPS(tblData, row, "Periode"))
        If p <> "" And Not periods.Exists(p) Then periods.Add p, True
    Next row

    Dim key As Variant, resRow As ListRow, npsValue As Variant
    For Each key In periods.Keys
        npsValue = CalculateNpsForNPS(tblData, CStr(key), "")
        Set resRow = FindOrCreateResultNPS(tblRes, CStr(key), "Winkel", GetShopNameNPS())
        SetCellNPS tblRes, resRow, "NPS", npsValue
    Next key

    Dim sellerTable As ListObject: Set sellerTable = FindTableNPS("Verkopers")
    If sellerTable Is Nothing Then Exit Sub

    Dim sr As ListRow, sid As String, name As String
    For Each sr In sellerTable.ListRows
        sid = Trim$(CStr(GetCellNPS(sellerTable, sr, "PersoneelsNr")))
        name = Trim$(CStr(GetCellNPS(sellerTable, sr, "Naam")))
        If sid <> "" And name <> "" Then
            For Each key In periods.Keys
                npsValue = CalculateNpsForNPS(tblData, CStr(key), sid)
                Set resRow = FindOrCreateResultNPS(tblRes, CStr(key), "Verkoper", name)
                SetCellNPS tblRes, resRow, "PersoneelsNr", sid
                SetCellNPS tblRes, resRow, "NPS", npsValue
            Next key
        End If
    Next sr
End Sub

Private Function CalculateNpsForNPS(ByVal tbl As ListObject, ByVal period As String, ByVal sellerId As String) As Variant
    Dim row As ListRow, total As Long, promoters As Long, detractors As Long
    Dim rowPeriod As String, rowSeller As String, t As String
    For Each row In tbl.ListRows
        rowPeriod = CStr(GetCellNPS(tbl, row, "Periode"))
        rowSeller = CStr(GetCellNPS(tbl, row, "PersoneelsNr"))
        If rowPeriod = period And (sellerId = "" Or rowSeller = sellerId) Then
            total = total + 1
            t = CStr(GetCellNPS(tbl, row, "Type"))
            If t = "Promotor" Then promoters = promoters + 1
            If t = "Detractor" Then detractors = detractors + 1
        End If
    Next row
    If total = 0 Then
        CalculateNpsForNPS = ""
    Else
        CalculateNpsForNPS = Round((promoters - detractors) / total * 100, 1)
    End If
End Function

Private Sub ExportNpsDataJsNPS(ByVal tbl As ListObject, ByVal sellerNames As Object, ByVal sellerActive As Object)
    Dim periods As Object: Set periods = CreateObject("Scripting.Dictionary")
    Dim row As ListRow, p As String
    For Each row In tbl.ListRows
        p = CStr(GetCellNPS(tbl, row, "Periode"))
        If p <> "" And Not periods.Exists(p) Then periods.Add p, True
    Next row

    Dim sortedPeriods As Variant
    sortedPeriods = SortedKeysNPS(periods)
    Dim latestPeriod As String
    If IsArray(sortedPeriods) Then
        If UBound(sortedPeriods) >= LBound(sortedPeriods) Then latestPeriod = CStr(sortedPeriods(UBound(sortedPeriods)))
    End If

    Dim json As String
    json = "{""generatedAt"":""" & JsonEscapeNPS(Format$(Now, "yyyy-mm-dd\Thh:nn:ss")) & """,""sourceFile"":""assets/NPS-Export.csv"","
    json = json & """columns"":{""date"":""" & JsonEscapeNPS(COL_DATE) & """,""score"":""" & JsonEscapeNPS(COL_SCORE) & """,""seller"":""" & JsonEscapeNPS(COL_SELLER) & """,""comment"":""" & JsonEscapeNPS(COL_COMMENT) & """},"
    json = json & """periods"":" & JsonArrayStringsNPS(sortedPeriods) & ",""latestPeriod"":""" & JsonEscapeNPS(latestPeriod) & ""","
    json = json & """store"":{""month"":" & BuildStoreMonthJsonNPS(tbl, sortedPeriods, False) & ",""ytd"":" & BuildStoreMonthJsonNPS(tbl, sortedPeriods, True) & "},"
    json = json & """sellers"":" & BuildSellersJsonNPS(tbl, sellerNames, sellerActive, sortedPeriods) & ","
    json = json & """details"":" & BuildDetailsJsonNPS(tbl, False) & ","
    json = json & """comments"":" & BuildDetailsJsonNPS(tbl, True) & ","
    json = json & """control"":" & BuildControlJsonNPS() & "}"

    WriteUtf8FileNPS LocalProjectPath() & "\assets\nps-data.js", "window.DIESTROYERS_NPS = " & json & ";" & vbCrLf
End Sub

Private Function BuildStoreMonthJsonNPS(ByVal tbl As ListObject, ByVal periods As Variant, ByVal ytd As Boolean) As String
    Dim s As String, i As Long, p As String
    s = "{"
    If IsArray(periods) Then
        For i = LBound(periods) To UBound(periods)
            p = CStr(periods(i))
            If i > LBound(periods) Then s = s & ","
            s = s & """" & JsonEscapeNPS(p) & """:" & SummaryJsonNPS(tbl, p, "", ytd)
        Next i
    End If
    BuildStoreMonthJsonNPS = s & "}"
End Function

Private Function BuildSellersJsonNPS(ByVal tbl As ListObject, ByVal sellerNames As Object, ByVal sellerActive As Object, ByVal periods As Variant) As String
    Dim s As String, sid As Variant, first As Boolean, i As Long, p As String
    first = True: s = "{"
    For Each sid In sellerNames.Keys
        If Not first Then s = s & ","
        first = False
        s = s & """" & JsonEscapeNPS(CStr(sid)) & """:{""name"":""" & JsonEscapeNPS(CStr(sellerNames(sid))) & """,""active"":" & LCase$(CStr(CBool(sellerActive(sid)))) & ","
        s = s & """month"":{"
        If IsArray(periods) Then
            For i = LBound(periods) To UBound(periods)
                If i > LBound(periods) Then s = s & ","
                p = CStr(periods(i))
                s = s & """" & p & """:" & SummaryJsonNPS(tbl, p, CStr(sid), False)
            Next i
        End If
        s = s & "},""ytd"":{"
        If IsArray(periods) Then
            For i = LBound(periods) To UBound(periods)
                If i > LBound(periods) Then s = s & ","
                p = CStr(periods(i))
                s = s & """" & p & """:" & SummaryJsonNPS(tbl, p, CStr(sid), True)
            Next i
        End If
        s = s & "},""comments"":" & BuildDetailsJsonForSellerNPS(tbl, CStr(sid)) & "}"
    Next sid
    BuildSellersJsonNPS = s & "}"
End Function

Private Function SummaryJsonNPS(ByVal tbl As ListObject, ByVal period As String, ByVal sellerId As String, ByVal ytd As Boolean) As String
    Dim row As ListRow, total As Long, pro As Long, neu As Long, det As Long
    Dim rp As String, rs As String, t As String, include As Boolean
    For Each row In tbl.ListRows
        rp = CStr(GetCellNPS(tbl, row, "Periode"))
        rs = CStr(GetCellNPS(tbl, row, "PersoneelsNr"))
        If ytd Then
            include = (Left$(rp, 4) = Left$(period, 4) And rp <= period)
        Else
            include = (rp = period)
        End If
        If include And (sellerId = "" Or rs = sellerId) Then
            total = total + 1
            t = CStr(GetCellNPS(tbl, row, "Type"))
            If t = "Promotor" Then pro = pro + 1
            If t = "Neutraal" Then neu = neu + 1
            If t = "Detractor" Then det = det + 1
        End If
    Next row
    Dim npsText As String
    If total = 0 Then npsText = "null" Else npsText = Replace$(CStr(Round((pro - det) / total * 100, 1)), ",", ".")
    SummaryJsonNPS = "{""nps"":" & npsText & ",""promoters"":" & pro & ",""passives"":" & neu & ",""detractors"":" & det & ",""cards"":" & total & "}"
End Function

Private Function BuildDetailsJsonNPS(ByVal tbl As ListObject, ByVal commentsOnly As Boolean) As String
    Dim s As String, row As ListRow, first As Boolean, c As String
    first = True: s = "["
    For Each row In tbl.ListRows
        c = CStr(GetCellNPS(tbl, row, "Commentaar"))
        If (Not commentsOnly) Or c <> "" Then
            If Not first Then s = s & ","
            first = False
            s = s & DetailRowJsonNPS(tbl, row)
        End If
    Next row
    BuildDetailsJsonNPS = s & "]"
End Function

Private Function BuildDetailsJsonForSellerNPS(ByVal tbl As ListObject, ByVal sellerId As String) As String
    Dim s As String, row As ListRow, first As Boolean, c As String
    first = True: s = "["
    For Each row In tbl.ListRows
        c = CStr(GetCellNPS(tbl, row, "Commentaar"))
        If CStr(GetCellNPS(tbl, row, "PersoneelsNr")) = sellerId And c <> "" Then
            If Not first Then s = s & ","
            first = False
            s = s & DetailRowJsonNPS(tbl, row)
        End If
    Next row
    BuildDetailsJsonForSellerNPS = s & "]"
End Function

Private Function DetailRowJsonNPS(ByVal tbl As ListObject, ByVal row As ListRow) As String
    Dim d As Date: d = CDate(GetCellNPS(tbl, row, "Datum"))
    DetailRowJsonNPS = "{""id"":""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "RecordId"))) & """,""date"":""" & Format$(d, "yyyy-mm-dd hh:nn:ss") & """,""dateIso"":""" & Format$(d, "yyyy-mm-dd\Thh:nn:ss") & """,""period"":""" & Format$(d, "yyyy-mm") & """,""year"":" & Year(d) & ",""score"":" & CLng(GetCellNPS(tbl, row, "Score")) & ",""type"":""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "Type"))) & """,""sellerBips"":""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "SellerBips"))) & """,""sellerName"":""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "Verkoper"))) & """,""sellerActive"":" & LCase$(CStr(LCase$(CStr(GetCellNPS(tbl, row, "Actief"))) = "ja")) & ",""linkStatus"":""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "Koppelstatus"))) & """,""comment"":""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "Commentaar"))) & """}"
End Function

Private Function BuildControlJsonNPS() As String
    Dim tbl As ListObject: Set tbl = FindTableNPS("NPS_Controle")
    If tbl Is Nothing Then BuildControlJsonNPS = "{}": Exit Function
    Dim s As String, row As ListRow, first As Boolean
    first = True: s = "{"
    For Each row In tbl.ListRows
        If Not first Then s = s & ","
        first = False
        s = s & """" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "Controle"))) & """:""" & JsonEscapeNPS(CStr(GetCellNPS(tbl, row, "Waarde"))) & """"
    Next row
    BuildControlJsonNPS = s & "}"
End Function

Private Sub BuildControlNPS(ByVal sourceRows As Long, ByVal validRows As Long, ByVal invalidRows As Long, ByVal linkedRows As Long, ByVal noSellerRows As Long, ByVal unknownRows As Long, ByVal commentRows As Long, ByVal unknownIds As Object)
    Dim ws As Worksheet, tbl As ListObject
    Set ws = GetOrCreateSheetNPS("NPS_Controle")
    Set tbl = EnsureTableNPS(ws, "NPS_Controle", Array("Controle", "Waarde"))
    ClearTableNPS tbl
    AddControlRowNPS tbl, "Laatste import", Format$(Now, "dd/mm/yyyy hh:nn:ss")
    AddControlRowNPS tbl, "Bronbestand", "assets\NPS-Export.csv"
    AddControlRowNPS tbl, "Bronrijen", sourceRows
    AddControlRowNPS tbl, "Geldige rijen", validRows
    AddControlRowNPS tbl, "Ongeldige rijen", invalidRows
    AddControlRowNPS tbl, "Gekoppeld", linkedRows
    AddControlRowNPS tbl, "Zonder SellerBips", noSellerRows
    AddControlRowNPS tbl, "Onbekende SellerBips", unknownRows
    AddControlRowNPS tbl, "Commentaren", commentRows
    AddControlRowNPS tbl, "Onbekende codes", JoinDictionaryKeysNPS(unknownIds)
    ws.Columns("A:B").AutoFit
End Sub

Private Sub AddControlRowNPS(ByVal tbl As ListObject, ByVal label As String, ByVal value As Variant)
    Dim lr As ListRow: Set lr = tbl.ListRows.Add
    SetCellNPS tbl, lr, "Controle", label
    SetCellNPS tbl, lr, "Waarde", value
End Sub

Private Sub LoadSellerMapNPS(ByVal names As Object, ByVal active As Object)
    Dim tbl As ListObject: Set tbl = FindTableNPS("Verkopers")
    If tbl Is Nothing Then Exit Sub
    Dim row As ListRow, sid As String, name As String, a As String
    For Each row In tbl.ListRows
        sid = Trim$(CStr(GetCellNPS(tbl, row, "PersoneelsNr")))
        name = Trim$(CStr(GetCellNPS(tbl, row, "Naam")))
        a = LCase$(Trim$(CStr(GetCellNPS(tbl, row, "Actief"))))
        If sid <> "" Then
            names(sid) = IIf(name = "", sid, name)
            active(sid) = Not (a = "nee" Or a = "no" Or a = "0" Or a = "false")
        End If
    Next row
End Sub

Private Function FindOrCreateResultNPS(ByVal tbl As ListObject, ByVal period As String, ByVal entityType As String, ByVal name As String) As ListRow
    Dim row As ListRow
    For Each row In tbl.ListRows
        If CStr(GetCellNPS(tbl, row, "Periode")) = period And LCase$(CStr(GetCellNPS(tbl, row, "EntiteitType"))) = LCase$(entityType) And LCase$(CStr(GetCellNPS(tbl, row, "Naam"))) = LCase$(name) Then
            Set FindOrCreateResultNPS = row
            Exit Function
        End If
    Next row
    Set row = tbl.ListRows.Add
    SetCellNPS tbl, row, "Periode", period
    SetCellNPS tbl, row, "EntiteitType", entityType
    SetCellNPS tbl, row, "Naam", name
    Set FindOrCreateResultNPS = row
End Function

Private Function GetShopNameNPS() As String
    On Error Resume Next
    GetShopNameNPS = CStr(ThisWorkbook.Worksheets("Instellingen").Range("B2").Value)
    If Trim$(GetShopNameNPS) = "" Then GetShopNameNPS = "Diest"
End Function

Private Function ParseCsvNPS(ByVal text As String) As Collection
    Dim result As New Collection, fields As Collection
    Dim field As String, inQuotes As Boolean, i As Long, ch As String, nextCh As String
    Set fields = New Collection
    text = Replace$(text, vbCrLf, vbLf)
    text = Replace$(text, vbCr, vbLf)
    For i = 1 To Len(text)
        ch = Mid$(text, i, 1)
        If ch = """" Then
            If inQuotes And i < Len(text) Then
                nextCh = Mid$(text, i + 1, 1)
                If nextCh = """" Then
                    field = field & """": i = i + 1
                Else
                    inQuotes = False
                End If
            Else
                inQuotes = True
            End If
        ElseIf ch = "," And Not inQuotes Then
            fields.Add field: field = ""
        ElseIf ch = vbLf And Not inQuotes Then
            fields.Add field: field = ""
            result.Add CollectionToArrayNPS(fields)
            Set fields = New Collection
        Else
            field = field & ch
        End If
    Next i
    If field <> "" Or fields.Count > 0 Then
        fields.Add field
        result.Add CollectionToArrayNPS(fields)
    End If
    Set ParseCsvNPS = result
End Function

Private Function CollectionToArrayNPS(ByVal c As Collection) As Variant
    Dim a() As String, i As Long
    ReDim a(0 To c.Count - 1)
    For i = 1 To c.Count: a(i - 1) = CStr(c(i)): Next i
    CollectionToArrayNPS = a
End Function

Private Function HeaderIndexNPS(ByVal headers As Variant, ByVal requiredName As String) As Long
    Dim i As Long
    Dim requiredKey As String
    HeaderIndexNPS = -1

    requiredKey = HeaderKeyNPS(requiredName)
    For i = LBound(headers) To UBound(headers)
        If HeaderKeyNPS(CStr(headers(i))) = requiredKey Then HeaderIndexNPS = i: Exit Function
    Next i
End Function

Private Function HeaderKeyNPS(ByVal headerText As String) As String
    ' Gebruik uitsluitend het stabiele ASCII-deel van elke verplichte kolom.
    ' Dit voorkomt dat UTF-8-tekens zoals e-accent verkeerd worden ingelezen
    ' wanneer VBA een .bas-bestand via de lokale Windows-codepagina importeert.
    Dim s As String
    s = LCase$(Trim$(headerText))

    If InStr(1, s, "date de fin", vbTextCompare) > 0 Then
        HeaderKeyNPS = "date"
    ElseIf InStr(1, s, "nps [", vbTextCompare) > 0 Then
        HeaderKeyNPS = "score"
    ElseIf InStr(1, s, "sellerbips", vbTextCompare) > 0 Then
        HeaderKeyNPS = "seller"
    ElseIf InStr(1, s, "verbatim -", vbTextCompare) > 0 Then
        HeaderKeyNPS = "comment"
    ElseIf InStr(1, s, "contrat de confiance", vbTextCompare) > 0 Then
        HeaderKeyNPS = "trust"
    ElseIf InStr(1, s, "s-edlp", vbTextCompare) > 0 Then
        HeaderKeyNPS = "price"
    ElseIf InStr(1, s, "matrice shop/ts_1", vbTextCompare) > 0 Then
        HeaderKeyNPS = "wait"
    ElseIf InStr(1, s, "matrice shop/ts_2", vbTextCompare) > 0 Then
        HeaderKeyNPS = "friendly"
    ElseIf InStr(1, s, "matrice shop/ts_3", vbTextCompare) > 0 Then
        HeaderKeyNPS = "information"
    End If
End Function

Private Function FieldNPS(ByVal fields As Variant, ByVal index As Long) As String
    On Error GoTo EmptyValue
    FieldNPS = CStr(fields(index))
    Exit Function
EmptyValue:
    FieldNPS = ""
End Function

Private Function TryParseDateNPS(ByVal text As String, ByRef value As Date) As Boolean
    On Error GoTo Geen
    Dim s As String: s = Trim$(text)
    If s = "" Then Exit Function
    If Len(s) >= 19 And Mid$(s, 5, 1) = "-" Then
        value = DateSerial(CInt(Left$(s, 4)), CInt(Mid$(s, 6, 2)), CInt(Mid$(s, 9, 2))) + TimeSerial(CInt(Mid$(s, 12, 2)), CInt(Mid$(s, 15, 2)), CInt(Mid$(s, 18, 2)))
    Else
        value = CDate(s)
    End If
    TryParseDateNPS = True
    Exit Function
Geen:
    TryParseDateNPS = False
End Function

Private Function TryParseScoreNPS(ByVal text As String, ByRef value As Long) As Boolean
    If Not IsNumeric(Replace$(Trim$(text), ",", ".")) Then Exit Function
    value = CLng(Val(Replace$(Trim$(text), ",", ".")))
    TryParseScoreNPS = (value >= 0 And value <= 10)
End Function

Private Function ExtractSellerBipsNPS(ByVal text As String) As String
    Dim i As Long, ch As String, digits As String
    For i = 1 To Len(text)
        ch = Mid$(text, i, 1)
        If ch >= "0" And ch <= "9" Then
            digits = digits & ch
        ElseIf digits <> "" Then
            Exit For
        End If
    Next i
    ExtractSellerBipsNPS = digits
End Function

Private Function NpsTypeNPS(ByVal score As Long) As String
    If score >= 9 Then
        NpsTypeNPS = "Promotor"
    ElseIf score >= 7 Then
        NpsTypeNPS = "Neutraal"
    Else
        NpsTypeNPS = "Detractor"
    End If
End Function

Private Function ReadUtf8FileNPS(ByVal path As String) As String
    Dim stm As Object: Set stm = CreateObject("ADODB.Stream")
    stm.Type = 2: stm.Charset = "utf-8": stm.Open: stm.LoadFromFile path
    ReadUtf8FileNPS = stm.ReadText
    stm.Close
End Function

Private Sub WriteUtf8FileNPS(ByVal path As String, ByVal text As String)
    ' Gebruik dezelfde veilige schrijver als de overige websitebestanden.
    ' Die schrijft eerst lokaal tijdelijk en kan OneDrive-locks opnieuw proberen.
    ' Rechtstreeks ADODB.SaveToFile op een gesynchroniseerde map gaf fout 5
    ' (Invalid procedure call or argument) wanneer het bestand kort bezet was.
    LocalWriteUtf8File path, text
End Sub

Private Function JsonEscapeNPS(ByVal text As String) As String
    text = Replace$(text, "\", "\\")
    text = Replace$(text, """", "\""")
    text = Replace$(text, vbCrLf, "\n")
    text = Replace$(text, vbCr, "\n")
    text = Replace$(text, vbLf, "\n")
    text = Replace$(text, vbTab, "\t")
    JsonEscapeNPS = text
End Function

Private Function JsonArrayStringsNPS(ByVal values As Variant) As String
    Dim s As String, i As Long
    s = "["
    If IsArray(values) Then
        For i = LBound(values) To UBound(values)
            If i > LBound(values) Then s = s & ","
            s = s & """" & JsonEscapeNPS(CStr(values(i))) & """"
        Next i
    End If
    JsonArrayStringsNPS = s & "]"
End Function

Private Function SortedKeysNPS(ByVal dict As Object) As Variant
    If dict.Count = 0 Then SortedKeysNPS = Array(): Exit Function
    Dim a() As String, i As Long, j As Long, tmp As String, k As Variant
    ReDim a(0 To dict.Count - 1)
    For Each k In dict.Keys: a(i) = CStr(k): i = i + 1: Next k
    For i = LBound(a) To UBound(a) - 1
        For j = i + 1 To UBound(a)
            If a(j) < a(i) Then tmp = a(i): a(i) = a(j): a(j) = tmp
        Next j
    Next i
    SortedKeysNPS = a
End Function

Private Function JoinDictionaryKeysNPS(ByVal dict As Object) As String
    If dict.Count = 0 Then Exit Function
    JoinDictionaryKeysNPS = Join(dict.Keys, ", ")
End Function

Private Function FindTableNPS(ByVal tableName As String) As ListObject
    Dim ws As Worksheet
    On Error Resume Next
    For Each ws In ThisWorkbook.Worksheets
        Set FindTableNPS = ws.ListObjects(tableName)
        If Not FindTableNPS Is Nothing Then Exit Function
    Next ws
    On Error GoTo 0
End Function

Private Function GetOrCreateSheetNPS(ByVal sheetName As String) As Worksheet
    On Error Resume Next
    Set GetOrCreateSheetNPS = ThisWorkbook.Worksheets(sheetName)
    On Error GoTo 0
    If GetOrCreateSheetNPS Is Nothing Then
        Set GetOrCreateSheetNPS = ThisWorkbook.Worksheets.Add(After:=ThisWorkbook.Worksheets(ThisWorkbook.Worksheets.Count))
        GetOrCreateSheetNPS.Name = sheetName
    End If
End Function

Private Function EnsureTableNPS(ByVal ws As Worksheet, ByVal tableName As String, ByVal cols As Variant) As ListObject
    Dim tbl As ListObject, i As Long
    On Error Resume Next: Set tbl = ws.ListObjects(tableName): On Error GoTo 0
    If tbl Is Nothing Then
        ws.Cells.Clear
        For i = LBound(cols) To UBound(cols): ws.Cells(1, i + 1).Value = cols(i): Next i
        Set tbl = ws.ListObjects.Add(xlSrcRange, ws.Range(ws.Cells(1, 1), ws.Cells(2, UBound(cols) + 1)), , xlYes)
        tbl.Name = tableName
        If tbl.ListRows.Count > 0 Then tbl.ListRows(1).Delete
    Else
        For i = LBound(cols) To UBound(cols)
            If Not HasColumnNPS(tbl, CStr(cols(i))) Then tbl.ListColumns.Add.Name = CStr(cols(i))
        Next i
    End If
    Set EnsureTableNPS = tbl
End Function

Private Function HasColumnNPS(ByVal tbl As ListObject, ByVal colName As String) As Boolean
    On Error Resume Next
    HasColumnNPS = Not tbl.ListColumns(colName) Is Nothing
    On Error GoTo 0
End Function

Private Sub ClearTableNPS(ByVal tbl As ListObject)
    Do While tbl.ListRows.Count > 0: tbl.ListRows(1).Delete: Loop
End Sub

Private Sub SetCellNPS(ByVal tbl As ListObject, ByVal row As ListRow, ByVal colName As String, ByVal value As Variant)
    On Error Resume Next
    row.Range.Cells(1, tbl.ListColumns(colName).Index).Value = value
    On Error GoTo 0
End Sub

Private Function GetCellNPS(ByVal tbl As ListObject, ByVal row As ListRow, ByVal colName As String) As Variant
    On Error Resume Next
    GetCellNPS = row.Range.Cells(1, tbl.ListColumns(colName).Index).Value
    On Error GoTo 0
End Function

Private Sub FormatDataSheetNPS(ByVal ws As Worksheet, ByVal tbl As ListObject)
    On Error Resume Next
    tbl.ListColumns("Datum").DataBodyRange.NumberFormat = "dd/mm/yyyy hh:mm"
    tbl.ListColumns("Commentaar").Range.ColumnWidth = 70
    tbl.ListColumns("Commentaar").DataBodyRange.WrapText = True
    ws.Rows(1).Font.Bold = True
    ws.Columns("A:L").EntireColumn.AutoFit
    tbl.ListColumns("Commentaar").Range.ColumnWidth = 70
    On Error GoTo 0
End Sub
