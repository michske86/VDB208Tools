Attribute VB_Name = "WebsiteExport"
Option Explicit

' ============================================================
' THE DIESTROYERS - WEBSITE EXPORT
' Versie zonder lange line-continuations.
' Lost VBA-fout "Too many line continuations" op.
' ============================================================

Public Sub ControleerWebsiteDatabestanden()
    On Error GoTo Fout
    ValidateWebsiteOutput
    MsgBox "Alle essentiele website- en TV-bestanden zijn geldig.", vbInformation, "The Diestroyers"
    Exit Sub
Fout:
    MsgBox "Controle websitebestanden mislukt." & vbCrLf & vbCrLf & "Fout " & Err.Number & " in " & Err.Source & ":" & vbCrLf & Err.Description, vbCritical, "The Diestroyers"
End Sub

Public Sub WebsiteBijwerken()
    Dim projectPath As String
    Dim currentStep As String
    Dim foutNummer As Long, foutBron As String, foutTekst As String

    On Error GoTo Fout

    projectPath = LocalProjectPath()
    If Len(projectPath) = 0 Then Exit Sub

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False

    currentStep = "assets-map voorbereiden"
    EnsureAssetsFolder
    currentStep = "adminconfiguratie synchroniseren"
    SynchroniseerAdminConfiguratie
    If Not AdminSyncIsGeslaagd() Then Err.Raise vbObjectError + 7601, "WebsiteBijwerken", "Adminconfiguratie kon niet worden gesynchroniseerd."

    currentStep = "NPS en Akte Van Vertrouwen publiceren"
    PubliceerNpsEnAvvZonderBlokkeren
    currentStep = "Portfolio publiceren"
    ImporteerEnPubliceerPortfolio
    currentStep = "agenda publiceren"
    ExportAgendaData
    currentStep = "verkopers publiceren"
    ExportVerkopersData
    currentStep = "actuele resultaten controleren"
    ValidateCurrentResultRows
    currentStep = "resultaten publiceren"
    ExportResultatenData
    currentStep = "gisteren-service publiceren"
    PubliceerGisterenServiceData
    currentStep = "omzetgegevens publiceren"
    ExportSalesExtraData
    ExportSalesDaysData
    currentStep = "carrousel publiceren"
    ExportCarouselData
    currentStep = "targets publiceren"
    ExportTargetsData
    currentStep = "KPI-definities publiceren"
    ExportKpisData
    ExportLegeIncentiveData
    currentStep = "historiek publiceren"
    ExportHistoriekData
    currentStep = "KPI-details publiceren"
    ExportKpiDetailData
    currentStep = "district publiceren"
    ExportDistrictData
    currentStep = "output controleren"
    ValidateWebsiteOutput

    Application.DisplayAlerts = True
    Application.ScreenUpdating = True

    MsgBox "Website bijgewerkt.", vbInformation, "The Diestroyers"
    Exit Sub

Fout:
    foutNummer = Err.Number
    foutBron = Err.Source
    foutTekst = Err.Description
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    Err.Raise foutNummer, "WebsiteBijwerken - " & currentStep & " - " & foutBron, foutTekst
End Sub

Private Sub EnsureAssetsFolder()
    EnsureLocalAssetsFolder
End Sub

Private Sub PubliceerNpsEnAvvZonderBlokkeren()
    Dim foutNummer As Long, foutTekst As String

    ' NPS/AVV is aanvullende dashboardinformatie. De hoofdpublicatie mag niet
    ' worden afgebroken door een tijdelijk probleem in die afzonderlijke export.
    On Error Resume Next
    Err.Clear
    ImporteerEnPubliceerNPS
    foutNummer = Err.Number
    foutTekst = Err.Description
    Err.Clear
    On Error GoTo 0

    If foutNummer <> 0 Then
        Debug.Print "NPS-publicatie overgeslagen (" & CStr(foutNummer) & "): " & foutTekst
    End If
End Sub

Private Sub ExportAgendaData()
    Dim m As String
    m = "datum:Datum:date|type:Type:text|titel:Titel:text|info:Info:text"
    ExportTableAsJs "Agenda", "Agenda", "DIESTROYERS_AGENDA", "agenda-data.js", m
End Sub

Private Sub ExportVerkopersData()
    Dim m As String
    m = "PersoneelsNr:PersoneelsNr:text|personeelsNr:PersoneelsNr:text|id:PersoneelsNr:text"
    m = m & "|Naam:Naam:text|naam:Naam:text"
    m = m & "|Avatar:Avatar:text|avatar:Avatar:text"
    m = m & "|Actief:Actief:text|actief:Actief:text"
    m = m & "|Startdatum:Startdatum:date|startdatum:Startdatum:date"
    m = m & "|Functie:Functie:text|functie:Functie:text"
    m = m & "|ShopNr:ShopNr:text|shopNr:ShopNr:text"
    m = m & "|ImportAlias:ImportAlias:text|importAlias:ImportAlias:text"
    ExportTableAsJs "Verkopers", "Verkopers", "DIESTROYERS_VERKOPERS", "verkopers-data.js", m
End Sub

Private Sub ExportResultatenData()
    Dim m As String
    m = "Periode:Periode:text|periode:Periode:text"
    m = m & "|EntiteitType:EntiteitType:text|entiteitType:EntiteitType:text"
    m = m & "|Naam:Naam:text|naam:Naam:text"
    m = m & "|PersoneelsNr:PersoneelsNr:text|personeelsNr:PersoneelsNr:text"
    m = m & "|Omzet:Omzet:number|omzet:Omzet:number"
    m = m & "|OmzetTarget:OmzetTarget:number|omzetTarget:OmzetTarget:number"
    m = m & "|Life:Life:number|life:Life:number"
    m = m & "|LifeTarget:LifeTarget:number|lifeTarget:LifeTarget:number"
    m = m & "|InsuranceStuks:InsuranceStuks:number|insuranceStuks:InsuranceStuks:number"
    m = m & "|InsuranceKansen:InsuranceKansen:number|insuranceKansen:InsuranceKansen:number"
    m = m & "|InsuranceTargetPct:InsuranceTargetPct:number|insuranceTargetPct:InsuranceTargetPct:number"
    m = m & "|AboStuks:AboStuks:number|aboStuks:AboStuks:number"
    m = m & "|AboKansen:AboKansen:number|aboKansen:AboKansen:number"
    m = m & "|AboTargetPct:AboTargetPct:number|aboTargetPct:AboTargetPct:number"
    m = m & "|DSPStuks:DSPStuks:number|dspStuks:DSPStuks:number"
    m = m & "|DSPKansen:DSPKansen:number|dspKansen:DSPKansen:number"
    m = m & "|DSPTargetPct:DSPTargetPct:number|dspTargetPct:DSPTargetPct:number"
    m = m & "|SPGStuks:SPGStuks:number|spgStuks:SPGStuks:number"
    m = m & "|SPGKansen:SPGKansen:number|spgKansen:SPGKansen:number"
    m = m & "|SPGTargetPct:SPGTargetPct:number|spgTargetPct:SPGTargetPct:number"
    m = m & "|SRPStuks:SRPStuks:number|srpStuks:SRPStuks:number"
    m = m & "|SRPKansen:SRPKansen:number|srpKansen:SRPKansen:number"
    m = m & "|SRPTargetPct:SRPTargetPct:number|srpTargetPct:SRPTargetPct:number"
    m = m & "|Accessoires:Accessoires:number|accessoires:Accessoires:number"
    m = m & "|AccessoiresTargetPct:AccessoiresTargetPct:number|accessoiresTargetPct:AccessoiresTargetPct:number"
    m = m & "|NPS:NPS:number|nps:NPS:number"
    m = m & "|NPSTarget:NPSTarget:number|npsTarget:NPSTarget:number"
    m = m & "|LinkPct:LinkPct:number|linkPct:LinkPct:number"
    m = m & "|LinkTargetPct:LinkTargetPct:number|linkTargetPct:LinkTargetPct:number"
    m = m & "|Monster:Monster:number|monster:Monster:number"
    m = m & "|MonsterTarget:MonsterTarget:number|monsterTarget:MonsterTarget:number"
    m = m & "|SStuks:SStuks:number|sStuks:SStuks:number"
    m = m & "|SEuro:SEuro:number|sEuro:SEuro:number"
    m = m & "|SRatio:SRatio:number|sRatio:SRatio:number"
    m = m & "|SStuksLY:SStuksLY:number|sStuksLY:SStuksLY:number"
    m = m & "|SEuroLY:SEuroLY:number|sEuroLY:SEuroLY:number"
    m = m & "|SRatioLY:SRatioLY:number|sRatioLY:SRatioLY:number"
    ExportTableAsJs "Resultaten", "Resultaten", "DIESTROYERS_RESULTATEN", "resultaten-data.js", m
End Sub

Private Sub ExportTargetsData()
    Dim m As String
    m = "Periode:Periode:text|periode:Periode:text"
    m = m & "|EntiteitType:EntiteitType:text|entiteitType:EntiteitType:text"
    m = m & "|Naam:Naam:text|naam:Naam:text"
    m = m & "|ShopNr:ShopNr:text|shopNr:ShopNr:text"
    m = m & "|OmzetTarget:OmzetTarget:number|omzetTarget:OmzetTarget:number"
    m = m & "|LifeTarget:LifeTarget:number|lifeTarget:LifeTarget:number"
    m = m & "|InsuranceTargetPct:InsuranceTargetPct:number|insuranceTargetPct:InsuranceTargetPct:number"
    m = m & "|AboTargetPct:AboTargetPct:number|aboTargetPct:AboTargetPct:number"
    m = m & "|DSPTargetPct:DSPTargetPct:number|dspTargetPct:DSPTargetPct:number"
    m = m & "|SPGTargetPct:SPGTargetPct:number|spgTargetPct:SPGTargetPct:number"
    m = m & "|SRPTargetPct:SRPTargetPct:number|srpTargetPct:SRPTargetPct:number"
    m = m & "|AccessoiresTargetPct:AccessoiresTargetPct:number|accessoiresTargetPct:AccessoiresTargetPct:number"
    m = m & "|NPSTarget:NPSTarget:number|npsTarget:NPSTarget:number"
    m = m & "|LinkTargetPct:LinkTargetPct:number|linkTargetPct:LinkTargetPct:number"
    m = m & "|MonsterTarget:MonsterTarget:number|monsterTarget:MonsterTarget:number"
    ExportTableAsJs "Targets", "Targets", "DIESTROYERS_TARGETS", "targets-data.js", m
End Sub

Private Sub ExportKpisData()
    Dim json As String
    json = "window.DIESTROYERS_KPIS = [" & vbCrLf
    json = json & "{""key"":""omzet"",""label"":""Omzet"",""type"":""euro"",""page"":""omzet.html""}," & vbCrLf
    json = json & "{""key"":""life"",""label"":""Life"",""type"":""stuks"",""page"":""life.html""}," & vbCrLf
    json = json & "{""key"":""insurance"",""label"":""Insurance"",""type"":""ratio"",""page"":""insurance.html""}," & vbCrLf
    json = json & "{""key"":""abo"",""label"":""Abonnementen"",""type"":""ratio"",""page"":""abonnementen.html""}," & vbCrLf
    json = json & "{""key"":""dsp"",""label"":""DSP"",""type"":""ratio"",""page"":""dsp.html""}," & vbCrLf
    json = json & "{""key"":""spg"",""label"":""SPG"",""type"":""ratio"",""page"":""spg.html""}," & vbCrLf
    json = json & "{""key"":""srp"",""label"":""SRP"",""type"":""ratio"",""page"":""srp.html""}," & vbCrLf
    json = json & "{""key"":""accessoires"",""label"":""Accessoires"",""type"":""euroPctOmzet"",""page"":""accessoires.html""}," & vbCrLf
    json = json & "{""key"":""nps"",""label"":""NPS"",""type"":""score"",""page"":""nps.html""}," & vbCrLf
    json = json & "{""key"":""link"",""label"":""Link"",""type"":""pct"",""subKpiOf"":""accessoires""}," & vbCrLf
    json = json & "{""key"":""monster"",""label"":""Monster"",""type"":""euro"",""subKpiOf"":""accessoires""}," & vbCrLf
    json = json & "{""key"":""s"",""label"":""S"",""type"":""pct""}" & vbCrLf
    json = json & "];"
    WriteTextFile LocalProjectPath() & "\assets\kpis-data.js", json
End Sub

Private Sub ExportIncentivesData()
    Dim m As String
    m = "id:IncentiveID:text|incentiveId:IncentiveID:text"
    m = m & "|titel:Titel:text|beschrijving:Omschrijving:text|omschrijving:Omschrijving:text"
    m = m & "|type:Type:text|scope:Scope:text"
    m = m & "|startdatum:StartDatum:date|einddatum:EindDatum:date"
    m = m & "|beloning:Beloning:text|actief:Actief:text"
    m = m & "|status:StatusAuto:text|statusAuto:StatusAuto:text"
    ExportTableAsJs "Incentives", "Incentives", "DIESTROYERS_INCENTIVES", "incentives-data.js", m
End Sub

Private Sub ExportIncentiveCriteriaData()
    Dim m As String
    m = "incentiveId:IncentiveID:text|kpi:KPI:text|gewicht:Gewicht:number|doel:Doel:number|richting:Richting:text"
    ExportTableAsJs "IncentiveCriteria", "IncentiveCriteria", "DIESTROYERS_INCENTIVE_CRITERIA", "incentive-criteria-data.js", m
End Sub

Private Sub ExportIncentiveBronnenData()
    Dim m As String
    m = "kpi:KPI:text|bron:Bron:text|waardeType:WaardeType:text|opmerking:Opmerking:text"
    ExportTableAsJs "IncentiveBronnen", "IncentiveBronnen", "DIESTROYERS_INCENTIVE_BRONNEN", "incentive-bronnen-data.js", m
End Sub

Private Sub ExportIncentiveDeelnemersData()
    Dim m As String
    m = "incentiveId:IncentiveID:text|entiteitType:EntiteitType:text|id:ID:text|naam:Naam:text"
    ExportTableAsJs "IncentiveDeelnemers", "IncentiveDeelnemers", "DIESTROYERS_INCENTIVE_DEELNEMERS", "incentive-deelnemers-data.js", m
End Sub

Private Sub ExportIncentiveScoresData()
    Dim m As String
    m = "periode:Periode:text|entiteitType:EntiteitType:text|personeelsNr:PersoneelsNr:text|naam:Naam:text"
    m = m & "|shopNr:ShopNr:text|kpi:KPI:text|waarde:Waarde:number"
    ExportTableAsJs "IncentiveScores", "IncentiveScores", "DIESTROYERS_INCENTIVE_SCORES", "incentive-scores-data.js", m
End Sub


Private Sub ExportSalesExtraData()
    Dim shopNr As String
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim totalRow As Long
    Dim yRow As Long
    Dim json As String
    Dim d As Date
    Dim periode As String
    Dim jaar As Long
    Dim maand As Long

    On Error GoTo Fout

    shopNr = Trim(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").value))
    Set ws = ThisWorkbook.Worksheets("I_Count")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    totalRow = 0

    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = shopNr Then
            If LCase(Trim(CStr(ws.Cells(i, 2).value))) = "total" Then
                totalRow = i
            End If
        End If
    Next i

    If totalRow <= 1 Then GoTo Fout
    yRow = totalRow - 1
    d = Date
    periode = BepaalResultatenPeriode()
    jaar = CLng(Left$(periode, 4))
    maand = CLng(Right$(periode, 2))

    json = "window.DIESTROYERS_SALES_EXTRA = {" & vbCrLf
    json = json & "  ""periode"":""" & periode & """," & vbCrLf
    json = json & "  ""omzetGisteren"":" & NumberForJson(ws.Cells(yRow, 3).value) & "," & vbCrLf
    json = json & "  ""omzetMaand"":" & NumberForJson(ws.Cells(totalRow, 3).value) & "," & vbCrLf
    json = json & "  ""omzetMtdVsLy"":" & SalesMtdVsLyForJson() & "," & vbCrLf
    json = json & "  ""klantenGisteren"":" & NumberForJson(ws.Cells(yRow, 14).value) & "," & vbCrLf
    json = json & "  ""klantenGisterenLy"":" & NumberForJson(ws.Cells(yRow, 15).value) & "," & vbCrLf
    json = json & "  ""klantenGisterenVsLy"":" & PercentForJson(ws.Cells(yRow, 16).value) & "," & vbCrLf
    json = json & "  ""klantenMaand"":" & NumberForJson(ws.Cells(totalRow, 14).value) & "," & vbCrLf
    json = json & "  ""klantenMaandLy"":" & NumberForJson(ws.Cells(totalRow, 15).value) & "," & vbCrLf
    json = json & "  ""klantenMaandVsLy"":" & PercentForJson(ws.Cells(totalRow, 16).value) & "," & vbCrLf
    json = json & "  ""concretisatieGisteren"":" & PercentForJson(ws.Cells(yRow, 18).value) & "," & vbCrLf
    json = json & "  ""concretisatieGisterenLy"":" & PercentForJson(ws.Cells(yRow, 19).value) & "," & vbCrLf
    json = json & "  ""concretisatieGisterenVsLy"":" & PercentForJson(ws.Cells(yRow, 18).value - ws.Cells(yRow, 19).value) & "," & vbCrLf
    json = json & "  ""concretisatieMaand"":" & PercentForJson(ws.Cells(totalRow, 18).value) & "," & vbCrLf
    json = json & "  ""concretisatieMaandLy"":" & PercentForJson(ws.Cells(totalRow, 19).value) & "," & vbCrLf
    json = json & "  ""concretisatieMaandVsLy"":" & PercentForJson(ws.Cells(totalRow, 18).value - ws.Cells(totalRow, 19).value) & "," & vbCrLf
    json = json & "  ""laatsteStuksPct"":" & LaatsteStuksPctForJson(shopNr) & "," & vbCrLf
    json = json & "  ""werkdagenMaand"":" & CStr(WerkdagenInMaand(jaar, maand)) & "," & vbCrLf
    json = json & "  ""werkdagenVoorbij"":" & CStr(WerkdagenVoorbijInPeriode(jaar, maand, d)) & vbCrLf
    json = json & "};"

    WriteTextFile LocalProjectPath() & "\assets\sales-extra-data.js", json
    Exit Sub

Fout:
    WriteTextFile LocalProjectPath() & "\assets\sales-extra-data.js", "window.DIESTROYERS_SALES_EXTRA = {};"
End Sub

Private Sub ExportSalesDaysData()
    Dim shopNr As String, lastRow As Long, i As Long, jaar As Long, maand As Long, laatsteDag As Long
    Dim ws As Worksheet, d As Date, key As String, datumCel As Variant, json As String, eerste As Boolean
    Dim dictOmzet As Object, dictDocs As Object, dictKlanten As Object, dictKlantenLy As Object, dictKlantenVsLy As Object, dictConc As Object, dictConcLy As Object, dictHas As Object
    Dim gewicht As Double, periode As String, totalRow As Long

    On Error GoTo Fout

    shopNr = Trim(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").value))
    Set ws = ThisWorkbook.Worksheets("I_Count")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    periode = BepaalResultatenPeriode()
    jaar = CLng(Left$(periode, 4))
    maand = CLng(Right$(periode, 2))
    laatsteDag = Day(DateSerial(jaar, maand + 1, 0))

    Set dictOmzet = CreateObject("Scripting.Dictionary")
    Set dictDocs = CreateObject("Scripting.Dictionary")
    Set dictKlanten = CreateObject("Scripting.Dictionary")
    Set dictKlantenLy = CreateObject("Scripting.Dictionary")
    Set dictKlantenVsLy = CreateObject("Scripting.Dictionary")
    Set dictConc = CreateObject("Scripting.Dictionary")
    Set dictConcLy = CreateObject("Scripting.Dictionary")
    Set dictHas = CreateObject("Scripting.Dictionary")

    totalRow = 0

    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = shopNr Then
            If LCase(Trim(CStr(ws.Cells(i, 2).value))) = "total" Then totalRow = i

            datumCel = ws.Cells(i, 2).value
            d = CountDateFromCell(datumCel)

            If d > 0 Then
                If Year(d) = jaar And Month(d) = maand Then
                    key = Format(d, "yyyy-mm-dd")
                    dictOmzet(key) = NumberForJson(ws.Cells(i, 3).value)
                    dictDocs(key) = NumberForJson(ws.Cells(i, 7).value)
                    dictKlanten(key) = NumberForJson(ws.Cells(i, 14).value)
                    dictKlantenLy(key) = NumberForJson(ws.Cells(i, 15).value)
                    dictKlantenVsLy(key) = PercentForJson(ws.Cells(i, 16).value)
                    dictConc(key) = PercentForJson(ws.Cells(i, 18).value)
                    dictConcLy(key) = PercentForJson(ws.Cells(i, 19).value)
                    dictHas(key) = "1"
                End If
            End If
        End If
    Next i

    VulOntbrekendeZaterdagAanIndienNodig ws, totalRow, jaar, maand, dictOmzet, dictDocs, dictKlanten, dictKlantenLy, dictKlantenVsLy, dictConc, dictHas

    json = "window.DIESTROYERS_SALES_DAYS = [" & vbCrLf
    eerste = True

    For i = 1 To laatsteDag
        d = DateSerial(jaar, maand, i)
        If IsWerkdag(d) Then
            key = Format(d, "yyyy-mm-dd")
            If Not eerste Then json = json & "," & vbCrLf
            eerste = False

            If Weekday(d, vbMonday) = 6 Then gewicht = 1.2 Else gewicht = 1

            json = json & "  {"
            json = json & """datum"":""" & key & """"
            json = json & ",""omzet"":" & DictVal(dictOmzet, key, "0")
            json = json & ",""documenten"":" & DictVal(dictDocs, key, "0")
            json = json & ",""klanten"":" & DictVal(dictKlanten, key, "0")
            json = json & ",""klantenLy"":" & DictVal(dictKlantenLy, key, "0")
            json = json & ",""klantenVsLy"":" & DictVal(dictKlantenVsLy, key, "0")
            json = json & ",""concretisatie"":" & DictVal(dictConc, key, "0")
            json = json & ",""concretisatieLy"":" & DictVal(dictConcLy, key, "0")
            json = json & ",""gewicht"":" & Replace(CStr(gewicht), ",", ".")
            json = json & ",""hasData"":" & DictVal(dictHas, key, "0")
            json = json & "}"
        End If
    Next i

    json = json & vbCrLf & "];"
    WriteTextFile LocalProjectPath() & "\assets\sales-days-data.js", json
    Exit Sub

Fout:
    WriteTextFile LocalProjectPath() & "\assets\sales-days-data.js", "window.DIESTROYERS_SALES_DAYS = [];"
End Sub

Private Sub VulOntbrekendeZaterdagAanIndienNodig(ByVal ws As Worksheet, ByVal totalRow As Long, ByVal jaar As Long, ByVal maand As Long, ByVal dictOmzet As Object, ByVal dictDocs As Object, ByVal dictKlanten As Object, ByVal dictKlantenLy As Object, ByVal dictKlantenVsLy As Object, ByVal dictConc As Object, ByVal dictHas As Object)
    Dim vandaag As Date, zondag As Date, zaterdag As Date, keyZat As String
    Dim totaalOmzet As Double, totaalDocs As Double, totaalKlanten As Double, totaalKlantenLy As Double
    Dim somOmzet As Double, somDocs As Double, somKlanten As Double, somKlantenLy As Double
    Dim omzetZat As Double, docsZat As Double, klantenZat As Double, klantenLyZat As Double
    Dim concZat As Double, klantenVsLyZat As Double
    Dim k As Variant

    On Error GoTo Klaar

    vandaag = Date
    If Weekday(vandaag, vbMonday) <> 1 Then Exit Sub

    zondag = vandaag - 1
    If IsWerkdag(zondag) Then Exit Sub

    zaterdag = vandaag - 2
    If Year(zaterdag) <> jaar Or Month(zaterdag) <> maand Then Exit Sub
    If totalRow <= 0 Then Exit Sub

    keyZat = Format(zaterdag, "yyyy-mm-dd")
    If dictHas.exists(keyZat) Then Exit Sub

    totaalOmzet = ToDoubleSafe(ws.Cells(totalRow, 3).value)
    totaalDocs = ToDoubleSafe(ws.Cells(totalRow, 7).value)
    totaalKlanten = ToDoubleSafe(ws.Cells(totalRow, 14).value)
    totaalKlantenLy = ToDoubleSafe(ws.Cells(totalRow, 15).value)

    For Each k In dictHas.keys
        somOmzet = somOmzet + ToDoubleSafe(dictOmzet(k))
        somDocs = somDocs + ToDoubleSafe(dictDocs(k))
        somKlanten = somKlanten + ToDoubleSafe(dictKlanten(k))
        somKlantenLy = somKlantenLy + ToDoubleSafe(dictKlantenLy(k))
    Next k

    omzetZat = totaalOmzet - somOmzet
    docsZat = totaalDocs - somDocs
    klantenZat = totaalKlanten - somKlanten
    klantenLyZat = totaalKlantenLy - somKlantenLy

    If omzetZat < 0 Then omzetZat = 0
    If docsZat < 0 Then docsZat = 0
    If klantenZat < 0 Then klantenZat = 0
    If klantenLyZat < 0 Then klantenLyZat = 0

    If omzetZat = 0 And docsZat = 0 And klantenZat = 0 Then Exit Sub

    If klantenZat > 0 Then concZat = docsZat / klantenZat * 100 Else concZat = 0
    If klantenLyZat > 0 Then klantenVsLyZat = (klantenZat / klantenLyZat - 1) * 100 Else klantenVsLyZat = 0

    dictOmzet(keyZat) = NumberForJson(omzetZat)
    dictDocs(keyZat) = NumberForJson(docsZat)
    dictKlanten(keyZat) = NumberForJson(klantenZat)
    dictKlantenLy(keyZat) = NumberForJson(klantenLyZat)
    dictKlantenVsLy(keyZat) = NumberForJson(klantenVsLyZat)
    dictConc(keyZat) = NumberForJson(concZat)
    dictHas(keyZat) = "1"

Klaar:
End Sub

Private Function DictVal(ByVal dict As Object, ByVal key As String, ByVal fallback As String) As String
    If dict.exists(key) Then
        DictVal = CStr(dict(key))
    Else
        DictVal = fallback
    End If
End Function

Private Sub ExportCarouselData()
    Dim folderPath As String
    Dim fileName As String
    Dim json As String
    Dim eerste As Boolean

    On Error GoTo Fout

    folderPath = LocalProjectPath() & "\assets\carousel"
    If Dir(folderPath, vbDirectory) = "" Then
        WriteTextFile LocalProjectPath() & "\assets\carousel-data.js", "window.DIESTROYERS_CAROUSEL = [];"
        Exit Sub
    End If

    json = "window.DIESTROYERS_CAROUSEL = [" & vbCrLf
    eerste = True
    fileName = Dir(folderPath & "\*.png")
    Do While fileName <> ""
        If Not eerste Then json = json & "," & vbCrLf
        eerste = False
        json = json & "  """ & JsonEscape(fileName) & """"
        fileName = Dir()
    Loop
    json = json & vbCrLf & "];"
    WriteTextFile LocalProjectPath() & "\assets\carousel-data.js", json
    Exit Sub

Fout:
    WriteTextFile LocalProjectPath() & "\assets\carousel-data.js", "window.DIESTROYERS_CAROUSEL = [];"
End Sub


Private Function BepaalResultatenPeriode() As String
    Dim d As Date
    d = Date

    If Day(d) = 1 Then
        BepaalResultatenPeriode = Format(DateAdd("m", -1, d), "yyyy-mm")
    Else
        BepaalResultatenPeriode = Format(d, "yyyy-mm")
    End If
End Function

Private Function CountDateFromCell(ByVal waarde As Variant) As Date
    Dim s As String
    Dim i As Long
    Dim digits As String
    Dim ch As String
    Dim y As Long
    Dim m As Long
    Dim d As Long

    If IsDate(waarde) Then
        CountDateFromCell = CDate(waarde)
        Exit Function
    End If

    s = Trim(CStr(waarde))
    digits = ""

    For i = 1 To Len(s)
        ch = Mid$(s, i, 1)
        If ch >= "0" And ch <= "9" Then digits = digits & ch
    Next i

    If Len(digits) >= 8 Then
        digits = Right$(digits, 8)
        y = CLng(Left$(digits, 4))
        m = CLng(Mid$(digits, 5, 2))
        d = CLng(Right$(digits, 2))
        If y >= 2000 And m >= 1 And m <= 12 And d >= 1 And d <= 31 Then
            CountDateFromCell = DateSerial(y, m, d)
        End If
    End If
End Function

Private Function WerkdagenVoorbijInPeriode(ByVal jaar As Long, ByVal maand As Long, ByVal vandaag As Date) As Long
    Dim d As Date
    Dim teller As Long
    Dim laatsteTeTellen As Long

    If Year(vandaag) = jaar And Month(vandaag) = maand Then
        laatsteTeTellen = Day(vandaag)
    ElseIf DateSerial(jaar, maand, 1) < DateSerial(Year(vandaag), Month(vandaag), 1) Then
        laatsteTeTellen = Day(DateSerial(jaar, maand + 1, 0))
    Else
        laatsteTeTellen = 0
    End If

    For teller = 1 To laatsteTeTellen
        d = DateSerial(jaar, maand, teller)
        If IsWerkdag(d) Then WerkdagenVoorbijInPeriode = WerkdagenVoorbijInPeriode + 1
    Next teller
End Function

Private Function WerkdagenInMaand(ByVal jaar As Long, ByVal maand As Long) As Long
    Dim d As Date
    Dim laatste As Long
    Dim teller As Long

    laatste = Day(DateSerial(jaar, maand + 1, 0))
    For teller = 1 To laatste
        d = DateSerial(jaar, maand, teller)
        If IsWerkdag(d) Then WerkdagenInMaand = WerkdagenInMaand + 1
    Next teller
End Function

Private Function WerkdagenVoorbij(ByVal vandaag As Date) As Long
    Dim d As Date
    Dim teller As Long

    For teller = 1 To Day(vandaag)
        d = DateSerial(Year(vandaag), Month(vandaag), teller)
        If IsWerkdag(d) Then WerkdagenVoorbij = WerkdagenVoorbij + 1
    Next teller
End Function

Private Function IsWerkdag(ByVal d As Date) As Boolean
    If IsBelgischeFeestdag(d) Then
        IsWerkdag = False
        Exit Function
    End If

    If Weekday(d, vbMonday) = 7 Then
        IsWerkdag = IsUitzonderlijkeZondagsopening(d)
    Else
        IsWerkdag = True
    End If
End Function

Private Function IsBelgischeFeestdag(ByVal d As Date) As Boolean
    Dim jaar As Long
    Dim pasen As Date

    jaar = Year(d)
    pasen = Paasdatum(jaar)

    Select Case d
        Case DateSerial(jaar, 1, 1)
            IsBelgischeFeestdag = True
        Case DateSerial(jaar, 5, 1)
            IsBelgischeFeestdag = True
        Case DateSerial(jaar, 7, 21)
            IsBelgischeFeestdag = True
        Case DateSerial(jaar, 8, 15)
            IsBelgischeFeestdag = True
        Case DateSerial(jaar, 11, 1)
            IsBelgischeFeestdag = True
        Case DateSerial(jaar, 11, 11)
            IsBelgischeFeestdag = True
        Case DateSerial(jaar, 12, 25)
            IsBelgischeFeestdag = True
        Case pasen + 1
            IsBelgischeFeestdag = True
        Case pasen + 39
            IsBelgischeFeestdag = True
        Case pasen + 50
            IsBelgischeFeestdag = True
        Case Else
            IsBelgischeFeestdag = False
    End Select
End Function

Private Function Paasdatum(ByVal jaar As Long) As Date
    Dim a As Long
    Dim b As Long
    Dim c As Long
    Dim d As Long
    Dim e As Long
    Dim f As Long
    Dim g As Long
    Dim h As Long
    Dim i As Long
    Dim k As Long
    Dim l As Long
    Dim m As Long
    Dim maand As Long
    Dim dag As Long

    a = jaar Mod 19
    b = jaar \ 100
    c = jaar Mod 100
    d = b \ 4
    e = b Mod 4
    f = (b + 8) \ 25
    g = (b - f + 1) \ 3
    h = (19 * a + b - d - g + 15) Mod 30
    i = c \ 4
    k = c Mod 4
    l = (32 + 2 * e + 2 * i - h - k) Mod 7
    m = (a + 11 * h + 22 * l) \ 451
    maand = (h + l - 7 * m + 114) \ 31
    dag = ((h + l - 7 * m + 114) Mod 31) + 1

    Paasdatum = DateSerial(jaar, maand, dag)
End Function

' ============================================================
' GENERIEKE EXPORTER
' ============================================================

Private Sub ExportTableAsJs(ByVal sheetName As String, ByVal tableName As String, ByVal jsVar As String, ByVal fileName As String, ByVal mappingsText As String)
    Dim ws As Worksheet
    Dim tbl As ListObject
    Dim r As ListRow
    Dim json As String
    Dim eerste As Boolean
    Dim i As Long
    Dim mappings() As String
    Dim parts() As String
    Dim propName As String
    Dim colName As String
    Dim valueType As String
    Dim valueText As String

    On Error GoTo Fout

    Set ws = ThisWorkbook.Worksheets(sheetName)
    Set tbl = ws.ListObjects(tableName)
    mappings = Split(mappingsText, "|")

    json = "window." & jsVar & " = [" & vbCrLf
    eerste = True

    For Each r In tbl.ListRows
        If RowHasContent(r) Then
            If Not eerste Then json = json & "," & vbCrLf
            eerste = False
            json = json & "  {"

            For i = LBound(mappings) To UBound(mappings)
                parts = Split(CStr(mappings(i)), ":")
                propName = parts(0)
                colName = parts(1)
                valueType = parts(2)

                If i > LBound(mappings) Then json = json & ","

                Select Case valueType
                    Case "number"
                        valueText = NumberForJson(GetTableValue(tbl, r, colName))
                    Case "date"
                        valueText = """" & JsonEscape(FormatDateForJson(GetTableValue(tbl, r, colName))) & """"
                    Case Else
                        valueText = """" & JsonEscape(GetTableValue(tbl, r, colName)) & """"
                End Select

                json = json & """" & propName & """:" & valueText
            Next i

            json = json & "}"
        End If
    Next r

    json = json & vbCrLf & "];"
    WriteTextFile LocalProjectPath() & "\assets\" & fileName, json
    Exit Sub

Fout:
    Dim foutNummer As Long, foutTekst As String
    foutNummer = Err.Number: foutTekst = Err.Description
    Err.Raise foutNummer, "ExportTableAsJs [" & fileName & "]", foutTekst
End Sub

Private Function RowHasContent(ByVal r As ListRow) As Boolean
    RowHasContent = (Application.WorksheetFunction.CountA(r.Range) > 0)
End Function

Private Function GetTableValue(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String) As Variant
    On Error GoTo GeenKolom
    GetTableValue = r.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
GeenKolom:
    GetTableValue = ""
End Function

Private Function NumberForJson(ByVal waarde As Variant) As String
    NumberForJson = DiestroyersJsonNumber(waarde)
End Function

Private Function PercentForJson(ByVal waarde As Variant) As String
    PercentForJson = DiestroyersJsonNumber(waarde)
End Function

Private Function FormatDateForJson(ByVal waarde As Variant) As String
    If IsDate(waarde) Then
        FormatDateForJson = Format(CDate(waarde), "yyyy-mm-dd")
    Else
        FormatDateForJson = Trim(CStr(waarde))
    End If
End Function

Private Function JsonEscape(ByVal waarde As Variant) As String
    Dim s As String

    If IsError(waarde) Or IsEmpty(waarde) Then
        s = ""
    Else
        s = CStr(waarde)
    End If

    s = Replace(s, "\", "\\")
    s = Replace(s, """", "\""")
    s = Replace(s, vbCrLf, "\n")
    s = Replace(s, vbCr, "\n")
    s = Replace(s, vbLf, "\n")
    s = Replace(s, vbTab, " ")

    JsonEscape = s
End Function




Private Sub ValidateCurrentResultRows()
    ValideerActueleResultatenOfGeefFout
End Sub

Private Function NormaliseerExportPeriode(ByVal value As Variant) As String
    If IsDate(value) Then
        NormaliseerExportPeriode = Format$(CDate(value), "yyyy-mm")
    Else
        NormaliseerExportPeriode = Left$(Trim$(CStr(value)), 7)
    End If
End Function

Private Function GetExportTableNumber(ByVal tbl As ListObject, ByVal r As ListRow, ByVal columnName As String) As Double
    On Error GoTo GeenWaarde
    GetExportTableNumber = DiestroyersNumber(r.Range.Cells(1, tbl.ListColumns(columnName).Index).Value)
    Exit Function
GeenWaarde:
    GetExportTableNumber = 0
End Function

Private Sub ValidateWebsiteOutput()
    Dim files As Variant, nonEmpty As Variant, fileName As Variant
    Dim filePath As String, txt As String, i As Long
    files = Array("agenda-data.js", "verkopers-data.js", "resultaten-data.js", "gisteren-service-data.js", "targets-data.js", "kpis-data.js", "kpi-detail-data.js", "historiek-maand-data.js", "district-data.js", "sales-extra-data.js", "sales-days-data.js", "carousel-data.js", "portfolio-data.js")
    nonEmpty = Array("verkopers-data.js", "resultaten-data.js", "targets-data.js", "district-data.js")
    For Each fileName In files
        filePath = LocalAssetsFile(CStr(fileName))
        If Not LocalFileExists(filePath) Then Err.Raise vbObjectError + 7610, "ValidateWebsiteOutput", "Exportbestand ontbreekt: " & filePath
        txt = LocalReadUtf8File(filePath)
        If Left$(txt, 7) <> "window." Then Err.Raise vbObjectError + 7611, "ValidateWebsiteOutput", "Ongeldig JavaScript-bestand: " & filePath
        For i = 1 To Len(txt)
            If AscW(Mid$(txt,i,1)) < 32 And Mid$(txt,i,1) <> vbCr And Mid$(txt,i,1) <> vbLf And Mid$(txt,i,1) <> vbTab Then Err.Raise vbObjectError + 7612, "ValidateWebsiteOutput", "Verborgen binaire tekens in: " & filePath
        Next i
    Next fileName
    For Each fileName In nonEmpty
        txt = LocalReadUtf8File(LocalAssetsFile(CStr(fileName)))
        If InStr(1, txt, "[];", vbBinaryCompare) > 0 Then Err.Raise vbObjectError + 7613, "ValidateWebsiteOutput", "Essentieel exportbestand is leeg: " & CStr(fileName)
    Next fileName

    'De TV gebruikt deze centrale regel voor alle service-KPI's.
    'Controleer dit expliciet, zodat een oudere calculations.js niet stil een lege TV kan veroorzaken.
    filePath = LocalAssetsFile("calculations.js")
    If Not LocalFileExists(filePath) Then Err.Raise vbObjectError + 7614, "ValidateWebsiteOutput", "Centrale rekenmodule ontbreekt: " & filePath
    txt = LocalReadUtf8File(filePath)
    If InStr(1, txt, "function servicePercentage", vbTextCompare) = 0 Or _
       InStr(1, txt, "servicePercentage", vbTextCompare) = 0 Then _
       Err.Raise vbObjectError + 7615, "ValidateWebsiteOutput", "Centrale servicePercentage-functie ontbreekt in: " & filePath
End Sub

Private Sub WriteTextFile(ByVal pad As String, ByVal inhoud As String)
    LocalWriteUtf8File pad, inhoud
End Sub

Private Sub WachtWebsiteExport(ByVal seconden As Double)
    Dim eindTijd As Double

    eindTijd = Timer + seconden

    If eindTijd >= 86400 Then
        Do While Timer > 10
            DoEvents
        Loop
        eindTijd = eindTijd - 86400
    End If

    Do While Timer < eindTijd
        DoEvents
    Loop
End Sub


Private Function SalesMtdVsLyForJson() As String
    On Error GoTo Fout
    Dim shopNr As String
    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long

    shopNr = Trim(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").value))
    Set ws = ThisWorkbook.Worksheets("I_Sales")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = shopNr Then
            If LCase(Trim(CStr(ws.Cells(i, 2).value))) = "total yr" Then
                SalesMtdVsLyForJson = PercentForJson(ws.Cells(i, 23).value)
                Exit Function
            End If
        End If
    Next i

Fout:
    SalesMtdVsLyForJson = "0"
End Function


Private Function LaatsteStuksPctForJson(ByVal shopNr As String) As String
    On Error GoTo Fout

    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim label As String

    Set ws = ThisWorkbook.Worksheets("I_S")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = Trim(CStr(shopNr)) Then
            label = LCase(Trim(CStr(ws.Cells(i, 2).value)))

            If InStr(1, label, "total", vbTextCompare) > 0 _
               Or InStr(1, label, "all groups", vbTextCompare) > 0 Then

                LaatsteStuksPctForJson = PercentForJson(ws.Cells(i, 9).value)
                Exit Function
            End If
        End If
    Next i

Fout:
    LaatsteStuksPctForJson = "0"
End Function



Private Function IsUitzonderlijkeZondagsopening(ByVal d As Date) As Boolean
    Dim y As Long
    Dim janFirstSunday As Date
    Dim julFirstSunday As Date
    Dim christmasSunday As Date

    y = Year(d)

    janFirstSunday = EersteZondagVanMaand(y, 1)
    julFirstSunday = EersteZondagVanMaand(y, 7)
    christmasSunday = DateSerial(y, 12, 24) - Weekday(DateSerial(y, 12, 24), vbSunday)

    IsUitzonderlijkeZondagsopening = _
        (DateValue(d) = DateValue(janFirstSunday)) _
        Or (DateValue(d) = DateValue(julFirstSunday)) _
        Or (DateValue(d) = DateValue(christmasSunday))
End Function

Private Function EersteZondagVanMaand(ByVal jaar As Long, ByVal maand As Long) As Date
    Dim d As Date
    d = DateSerial(jaar, maand, 1)

    Do While Weekday(d, vbMonday) <> 7
        d = d + 1
    Loop

    EersteZondagVanMaand = d
End Function

Private Function ToDoubleSafe(ByVal waarde As Variant) As Double
    Dim s As String

    If IsNumeric(waarde) Then
        ToDoubleSafe = CDbl(waarde)
        Exit Function
    End If

    s = Trim(CStr(waarde))
    s = Replace(s, "%", "")
    s = Replace(s, " ", "")
    s = Replace(s, Chr(160), "")

    If InStr(s, ",") > 0 Then
        s = Replace(s, ".", "")
        s = Replace(s, ",", ".")
    End If

    If IsNumeric(s) Then
        ToDoubleSafe = CDbl(s)
    Else
        ToDoubleSafe = 0
    End If
End Function


Private Sub ExportLegeIncentiveData()
    On Error Resume Next
    WriteTextFile LocalProjectPath() & "\assets\incentives-data.js", "window.DIESTROYERS_INCENTIVES = [];"
    WriteTextFile LocalProjectPath() & "\assets\incentive-scores-data.js", "window.DIESTROYERS_INCENTIVE_SCORES = [];"
    WriteTextFile LocalProjectPath() & "\assets\incentive-criteria-data.js", "window.DIESTROYERS_INCENTIVE_CRITERIA = [];"
    WriteTextFile LocalProjectPath() & "\assets\incentive-bronnen-data.js", "window.DIESTROYERS_INCENTIVE_BRONNEN = [];"
    WriteTextFile LocalProjectPath() & "\assets\incentive-deelnemers-data.js", "window.DIESTROYERS_INCENTIVE_DEELNEMERS = [];"
End Sub


Private Sub ExportHistoriekData()
    On Error GoTo Fout
    If SheetTableExists("Historiek_Maand", "tblHistoriekMaand") Then
        ExportTableAsJs "Historiek_Maand", "tblHistoriekMaand", "DIESTROYERS_HISTORIEK_MAAND", "historiek-maand-data.js", _
            "Periode:Periode:text|EntiteitType:EntiteitType:text|PersoneelsNr:PersoneelsNr:text|Naam:Naam:text|ShopNr:ShopNr:text|KPI:KPI:text|SubKPI:SubKPI:text|Waarde:Waarde:number|WaardePct:WaardePct:number|Stuks:Stuks:number|Kansen:Kansen:number|Target:Target:number|TargetPct:TargetPct:number|VorigJaar:VorigJaar:number|VorigJaarPct:VorigJaarPct:number|Status:Status:text|Punten:Punten:number|Bron:Bron:text|LaatsteUpdate:LaatsteUpdate:text"
    Else
        WriteTextFile LocalProjectPath() & "\assets\historiek-maand-data.js", "window.DIESTROYERS_HISTORIEK_MAAND = [];"
    End If

    If SheetTableExists("Historiek_Dag", "tblHistoriekDag") Then
        ExportTableAsJs "Historiek_Dag", "tblHistoriekDag", "DIESTROYERS_HISTORIEK_DAG", "historiek-dag-data.js", _
            "Datum:Datum:date|Periode:Periode:text|ShopNr:ShopNr:text|Omzet:Omzet:number|DagTarget:DagTarget:number|Documenten:Documenten:number|Klanten:Klanten:number|KlantenLY:KlantenLY:number|KlantenVsLYPct:KlantenVsLYPct:number|GemiddeldeVerkoopprijs:GemiddeldeVerkoopprijs:number|GemiddeldeVerkoopprijsLY:GemiddeldeVerkoopprijsLY:number|ConcretisatiePct:ConcretisatiePct:number|ConcretisatieLYPct:ConcretisatieLYPct:number|IsZaterdag:IsZaterdag:text|IsZondag:IsZondag:text|IsUitzonderlijkeZondag:IsUitzonderlijkeZondag:text|IsFeestdag:IsFeestdag:text|IsOpen:IsOpen:text|Bron:Bron:text|LaatsteUpdate:LaatsteUpdate:text"
    Else
        WriteTextFile LocalProjectPath() & "\assets\historiek-dag-data.js", "window.DIESTROYERS_HISTORIEK_DAG = [];"
    End If
    Exit Sub
Fout:
    WriteTextFile LocalProjectPath() & "\assets\historiek-maand-data.js", "window.DIESTROYERS_HISTORIEK_MAAND = [];"
    WriteTextFile LocalProjectPath() & "\assets\historiek-dag-data.js", "window.DIESTROYERS_HISTORIEK_DAG = [];"
End Sub

Private Function SheetTableExists(ByVal sheetName As String, ByVal tableName As String) As Boolean
    On Error GoTo Fout
    SheetTableExists = Not ThisWorkbook.Worksheets(sheetName).ListObjects(tableName) Is Nothing
    Exit Function
Fout:
    SheetTableExists = False
End Function


Private Sub ExportKpiDetailData()
    Dim wsR As Worksheet
    Dim tblR As ListObject
    Dim r As ListRow
    Dim json As String
    Dim eerste As Boolean
    Dim periode As String
    Dim entiteitType As String
    Dim naam As String
    Dim shopNr As String
    Dim personeelsNr As String

    On Error GoTo Fout

    Set wsR = ThisWorkbook.Worksheets("Resultaten")
    Set tblR = wsR.ListObjects("Resultaten")

    json = "window.DIESTROYERS_KPI_DETAIL = [" & vbCrLf
    eerste = True

    For Each r In tblR.ListRows
        periode = CStr(CellVal(tblR, r, "Periode"))
        entiteitType = CStr(CellVal(tblR, r, "EntiteitType"))
        naam = CStr(CellVal(tblR, r, "Naam"))
        shopNr = CStr(CellVal(tblR, r, "ShopNr"))
        personeelsNr = CStr(CellVal(tblR, r, "PersoneelsNr"))

        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Insurance", "Mobiel", "", CellVal(tblR, r, "InsuranceMobielPct"), CellVal(tblR, r, "InsuranceMobielStuks"), CellVal(tblR, r, "InsuranceMobielKansen"), "", "", "", CellVal(tblR, r, "InsuranceMobielPctLY")
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Insurance", "Multimedia", "", CellVal(tblR, r, "InsuranceMultimediaPct"), CellVal(tblR, r, "InsuranceMultimediaStuks"), CellVal(tblR, r, "InsuranceMultimediaKansen"), "", "", "", CellVal(tblR, r, "InsuranceMultimediaPctLY")

        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "GEM", "", CellVal(tblR, r, "LinkGEM"), "", "", "", "", "", ""
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "PEM", "", CellVal(tblR, r, "LinkPEM"), "", "", "", "", "", ""
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "RTV", "", CellVal(tblR, r, "LinkRTV"), "", "", "", "", "", ""
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "COMM", "", CellVal(tblR, r, "LinkCOMM"), "", "", "", "", "", ""
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Link", "MM", "", CellVal(tblR, r, "LinkMM"), "", "", "", "", "", ""

        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "S", "", CellVal(tblR, r, "SEuro"), CellVal(tblR, r, "SRatio"), CellVal(tblR, r, "SStuks"), "", "", "", CellVal(tblR, r, "SEuroLY"), CellVal(tblR, r, "SRatioLY")
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "BuyWay", "", "", CellVal(tblR, r, "BuyWayPct"), CellVal(tblR, r, "BuyWayStuks"), CellVal(tblR, r, "BuyWayKansen"), "", "", "", ""
        AddDetailJson json, eerste, periode, entiteitType, personeelsNr, naam, shopNr, "Leaders", "", "", CellVal(tblR, r, "LeadersPct"), CellVal(tblR, r, "LeadersStuks"), CellVal(tblR, r, "LeadersKansen"), "", "", CellVal(tblR, r, "LeadersStuksLY"), CellVal(tblR, r, "LeadersPctLY")
    Next r

    json = json & vbCrLf & "];"
    WriteTextFile LocalProjectPath() & "\assets\kpi-detail-data.js", json
    Exit Sub
Fout:
    WriteTextFile LocalProjectPath() & "\assets\kpi-detail-data.js", "window.DIESTROYERS_KPI_DETAIL = [];"
End Sub

Private Sub AddDetailJson(ByRef json As String, ByRef eerste As Boolean, ByVal periode As String, ByVal entiteitType As String, ByVal personeelsNr As String, ByVal naam As String, ByVal shopNr As String, ByVal kpi As String, ByVal subKpi As String, ByVal waarde As Variant, ByVal waardePct As Variant, ByVal stuks As Variant, ByVal kansen As Variant, ByVal target As Variant, ByVal targetPct As Variant, ByVal vorigJaar As Variant, ByVal vorigJaarPct As Variant)
    If CStr(waarde) = "" And CStr(waardePct) = "" And CStr(stuks) = "" And CStr(kansen) = "" Then Exit Sub

    If Not eerste Then json = json & "," & vbCrLf
    eerste = False

    json = json & "  {"
    json = json & """Periode"":""" & JsonEscape(periode) & """"
    json = json & ",""EntiteitType"":""" & JsonEscape(entiteitType) & """"
    json = json & ",""PersoneelsNr"":""" & JsonEscape(personeelsNr) & """"
    json = json & ",""Naam"":""" & JsonEscape(naam) & """"
    json = json & ",""ShopNr"":""" & JsonEscape(shopNr) & """"
    json = json & ",""KPI"":""" & JsonEscape(kpi) & """"
    json = json & ",""SubKPI"":""" & JsonEscape(subKpi) & """"
    json = json & ",""Waarde"":" & NumberForJson(waarde)
    json = json & ",""WaardePct"":" & PercentForJson(waardePct)
    json = json & ",""Stuks"":" & NumberForJson(stuks)
    json = json & ",""Kansen"":" & NumberForJson(kansen)
    json = json & ",""Target"":" & NumberForJson(target)
    json = json & ",""TargetPct"":" & PercentForJson(targetPct)
    json = json & ",""VorigJaar"":" & NumberForJson(vorigJaar)
    json = json & ",""VorigJaarPct"":" & PercentForJson(vorigJaarPct)
    json = json & "}"
End Sub

Private Function CellVal(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String) As Variant
    On Error GoTo Fout
    CellVal = r.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
Fout:
    CellVal = ""
End Function


'Wrapper: district export lives in DistrictVergelijking.bas.
'If that module is not imported yet, WebsiteBijwerken continues without breaking.
Private Sub ExportDistrictDataSafe()
    On Error Resume Next
    Application.Run "ExportDistrictData"
    On Error GoTo 0
End Sub
