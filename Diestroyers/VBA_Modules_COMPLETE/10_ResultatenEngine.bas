Attribute VB_Name = "ResultatenEngine"
Option Explicit

Private mOntbrekendeBronnen As String

Public Sub VerwerkGeimporteerdeResultaten(Optional ByVal toonMelding As Boolean = True, Optional ByVal archiveer As Boolean = True)
    Dim periode As String, shopNr As String
    Dim tblVerkopers As ListObject, tblResultaten As ListObject
    Dim r As ListRow
    Dim naam As String, personeelsNr As String, actief As String
    Dim backup As Variant
    Dim foutNummer As Long, foutBron As String, foutTekst As String

    On Error GoTo Fout

    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    Application.EnableEvents = False

    periode = BepaalResultatenPeriode()
    shopNr = Trim$(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").Value))

    Set tblVerkopers = ThisWorkbook.Worksheets("Verkopers").ListObjects("Verkopers")
    Set tblResultaten = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")

    backup = tblResultaten.Range.Value2
    mOntbrekendeBronnen = ""

    ' Winkelrij verwerken.
    VerwerkEntiteit tblResultaten, periode, "Winkel", "Diest", shopNr, ""

    ' Alleen actieve verkopers verwerken.
    For Each r In tblVerkopers.ListRows
        naam = Trim$(CStr(r.Range.Cells(1, tblVerkopers.ListColumns("Naam").Index).Value))
        actief = LCase$(Trim$(CStr(r.Range.Cells(1, tblVerkopers.ListColumns("Actief").Index).Value)))
        personeelsNr = Trim$(CStr(r.Range.Cells(1, tblVerkopers.ListColumns("PersoneelsNr").Index).Value))

        If naam <> "" And personeelsNr <> "" Then
            If actief <> "nee" And actief <> "no" And actief <> "0" And actief <> "false" And actief <> "inactief" Then
                VerwerkEntiteit tblResultaten, periode, "Verkoper", naam, shopNr, personeelsNr
            End If
        End If
    Next r

    OpschonenInactieveVerkopersActuelePeriode
    HerberekenSResultatenActuelePeriode

    If archiveer Then
        On Error Resume Next
        ArchiveerHuidigeMaandNaarHistoriek
        On Error GoTo Fout
    End If

Klaar:
    Application.EnableEvents = True
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True

    If foutNummer <> 0 Then
        On Error GoTo 0
        Err.Raise foutNummer, foutBron, foutTekst
    End If

    If toonMelding Then
        If Len(mOntbrekendeBronnen) = 0 Then
            MsgBox "Geimporteerde resultaten veilig verwerkt voor " & periode & ".", vbInformation, "The Diestroyers"
        Else
            MsgBox "De beschikbare resultaten zijn verwerkt voor " & periode & "." & vbCrLf & vbCrLf & _
                   "Bestaande waarden werden behouden waar een bronrij ontbrak:" & vbCrLf & _
                   mOntbrekendeBronnen, vbExclamation, "The Diestroyers"
        End If
    End If
    Exit Sub

Fout:
    foutNummer = Err.Number
    foutBron = Err.Source
    foutTekst = Err.Description

    On Error Resume Next
    If Not tblResultaten Is Nothing Then HerstelResultatenBackup tblResultaten, backup
    On Error GoTo 0

    GoTo Klaar
End Sub

Public Sub HerstelResultatenUitHuidigeImportbladen()
    Dim bronnenOK As Boolean
    Dim snapshotGebruikt As Boolean

    On Error GoTo Fout

    bronnenOK = KernBronnenVolledigBeschikbaar()

    If bronnenOK Then
        VerwerkGeimporteerdeResultaten False, False
    Else
        ' Belangrijk: ontbrekende importbronnen mogen correcte of herstelbare
        ' resultaten nooit opnieuw naar nul reduceren.
        If ActueleKernResultatenZijnLeeg() Then
            HerstelResultatenVanProjectSnapshot False
            snapshotGebruikt = True
        End If
    End If

    ValideerActueleResultatenOfGeefFout
    VerwerkDistrictActueel
    WebsiteBijwerken
    ControleerWebsiteDatabestanden

    If snapshotGebruikt Then
        MsgBox "Resultaten zijn hersteld vanuit de gecontroleerde projectsnapshot en gepubliceerd." & vbCrLf & vbCrLf & _
               "De importbladen waren niet volledig beschikbaar. Bestaande gegevens zijn niet overschreven.", _
               vbInformation, "The Diestroyers"
    ElseIf bronnenOK Then
        MsgBox "Resultaten zijn opnieuw opgebouwd vanuit de huidige importbladen en gepubliceerd.", _
               vbInformation, "The Diestroyers"
    Else
        MsgBox "De importbladen waren niet volledig beschikbaar." & vbCrLf & vbCrLf & _
               "De bestaande geldige resultaten zijn behouden en opnieuw gepubliceerd.", _
               vbExclamation, "The Diestroyers"
    End If
    Exit Sub

Fout:
    MsgBox "Resultaten herstellen mislukt." & vbCrLf & vbCrLf & _
           "Fout " & Err.Number & " in " & Err.Source & ":" & vbCrLf & _
           Err.Description, vbCritical, "The Diestroyers"
End Sub


Public Sub HerstelResultatenVanProjectSnapshot(Optional ByVal publiceer As Boolean = True)
    Dim bestand As String
    Dim inhoud As String
    Dim regels As Variant
    Dim koppen As Variant
    Dim velden As Variant
    Dim tbl As ListObject
    Dim rr As ListRow
    Dim i As Long, j As Long
    Dim kolomNaam As String
    Dim celWaarde As String
    Dim backup As Variant
    Dim foutNummer As Long, foutBron As String, foutTekst As String

    On Error GoTo Fout

    bestand = LocalAssetsFile("resultaten-recovery.tsv")
    If Not LocalFileExists(bestand) Then
        Err.Raise vbObjectError + 7780, "HerstelResultatenVanProjectSnapshot", _
                  "Herstelbestand ontbreekt:" & vbCrLf & bestand
    End If

    Set tbl = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    backup = tbl.Range.Value2

    inhoud = LocalReadUtf8File(bestand)
    inhoud = Replace(inhoud, vbCrLf, vbLf)
    inhoud = Replace(inhoud, vbCr, vbLf)
    regels = Split(inhoud, vbLf)

    If UBound(regels) < 1 Then
        Err.Raise vbObjectError + 7781, "HerstelResultatenVanProjectSnapshot", _
                  "Het herstelbestand bevat geen resultaatrijen."
    End If

    koppen = Split(CStr(regels(0)), vbTab)

    If Not tbl.DataBodyRange Is Nothing Then tbl.DataBodyRange.Delete

    For i = 1 To UBound(regels)
        If Len(Trim$(CStr(regels(i)))) > 0 Then
            velden = Split(CStr(regels(i)), vbTab)
            Set rr = tbl.ListRows.Add

            For j = LBound(koppen) To UBound(koppen)
                kolomNaam = Trim$(CStr(koppen(j)))

                If j <= UBound(velden) Then
                    celWaarde = CStr(velden(j))
                Else
                    celWaarde = ""
                End If

                If HeeftResultaatKolom(tbl, kolomNaam) Then
                    If IsResultaatTekstKolom(kolomNaam) Then
                        rr.Range.Cells(1, tbl.ListColumns(kolomNaam).Index).Value = celWaarde
                    ElseIf Len(Trim$(celWaarde)) = 0 Then
                        rr.Range.Cells(1, tbl.ListColumns(kolomNaam).Index).ClearContents
                    Else
                        rr.Range.Cells(1, tbl.ListColumns(kolomNaam).Index).Value = DiestroyersNumber(celWaarde)
                    End If
                End If
            Next j
        End If
    Next i

    ApplyTargetsToResultaten
    OpschonenInactieveVerkopersActuelePeriode
    ValideerActueleResultatenOfGeefFout

    If publiceer Then
        VerwerkDistrictActueel
        WebsiteBijwerken
        ControleerWebsiteDatabestanden

        MsgBox "De resultaten zijn hersteld vanuit de gecontroleerde projectsnapshot.", _
               vbInformation, "The Diestroyers"
    End If
    Exit Sub

Fout:
    foutNummer = Err.Number
    foutBron = Err.Source
    foutTekst = Err.Description

    On Error Resume Next
    If Not tbl Is Nothing Then HerstelResultatenBackup tbl, backup
    On Error GoTo 0

    Err.Raise foutNummer, foutBron, foutTekst
End Sub

Private Function KernBronnenVolledigBeschikbaar() As Boolean
    Dim tblV As ListObject
    Dim r As ListRow
    Dim shopNr As String
    Dim naam As String
    Dim id As String
    Dim actief As String
    Dim waarde As Double
    Dim waarde2 As Double
    Dim accOK As Boolean
    Dim lifeOK As Boolean
    Dim actiefAantal As Long
    Dim omzetAantal As Long
    Dim lifeAantal As Long
    Dim winkelOmzetOK As Boolean
    Dim winkelLifeOK As Boolean

    On Error GoTo NietBeschikbaar

    shopNr = Trim$(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").Value))
    Set tblV = ThisWorkbook.Worksheets("Verkopers").ListObjects("Verkopers")

    winkelOmzetOK = TryHaalWinkelOmzet(shopNr, waarde)
    winkelLifeOK = TryZoekShopWaarde("I_LifeShops", shopNr, 4, waarde)

    For Each r In tblV.ListRows
        naam = Trim$(CStr(r.Range.Cells(1, tblV.ListColumns("Naam").Index).Value))
        id = Trim$(CStr(r.Range.Cells(1, tblV.ListColumns("PersoneelsNr").Index).Value))
        actief = LCase$(Trim$(CStr(r.Range.Cells(1, tblV.ListColumns("Actief").Index).Value)))

        If naam <> "" And id <> "" Then
            If actief <> "nee" And actief <> "no" And actief <> "0" And actief <> "false" And actief <> "inactief" Then
                actiefAantal = actiefAantal + 1

                waarde = 0
                waarde2 = 0
                accOK = TryZoekIAccPersoon(shopNr, id, "total sales access", 8, waarde) Or _
                        TryZoekIAccPersoon(shopNr, id, "total sales hw", 8, waarde2)
                If accOK Then omzetAantal = omzetAantal + 1

                waarde = 0
                lifeOK = TryZoekLifePersoon(shopNr, id, waarde)
                If lifeOK Then lifeAantal = lifeAantal + 1
            End If
        End If
    Next r

    KernBronnenVolledigBeschikbaar = _
        winkelOmzetOK And winkelLifeOK And actiefAantal > 0 And _
        omzetAantal = actiefAantal And lifeAantal = actiefAantal
    Exit Function

NietBeschikbaar:
    KernBronnenVolledigBeschikbaar = False
End Function

Private Function ActueleKernResultatenZijnLeeg() As Boolean
    Dim tblR As ListObject
    Dim r As ListRow
    Dim periode As String
    Dim typeNaam As String
    Dim omzetSom As Double
    Dim lifeSom As Double
    Dim accSom As Double
    Dim aantal As Long

    periode = BepaalResultatenPeriode()
    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")

    For Each r In tblR.ListRows
        If NormaliseerPeriode(GetResultaatCel(tblR, r, "Periode")) = periode Then
            typeNaam = LCase$(Trim$(CStr(GetResultaatCel(tblR, r, "EntiteitType"))))

            If typeNaam = "verkoper" Then
                aantal = aantal + 1
                omzetSom = omzetSom + DiestroyersNumber(GetResultaatCel(tblR, r, "Omzet"))
                lifeSom = lifeSom + DiestroyersNumber(GetResultaatCel(tblR, r, "Life"))
                accSom = accSom + DiestroyersNumber(GetResultaatCel(tblR, r, "Accessoires"))
            End If
        End If
    Next r

    ActueleKernResultatenZijnLeeg = _
        (aantal = 0 Or (omzetSom = 0 And lifeSom = 0 And accSom = 0))
End Function

Private Function HeeftResultaatKolom(ByVal tbl As ListObject, ByVal kolomNaam As String) As Boolean
    On Error Resume Next
    HeeftResultaatKolom = (tbl.ListColumns(kolomNaam).Index > 0)
    On Error GoTo 0
End Function

Private Function IsResultaatTekstKolom(ByVal kolomNaam As String) As Boolean
    Select Case LCase$(Trim$(kolomNaam))
        Case "periode", "entiteittype", "naam", "personeelsnr", "shopnr"
            IsResultaatTekstKolom = True
    End Select
End Function

Private Sub VerwerkEntiteit(ByVal tbl As ListObject, ByVal periode As String, ByVal entiteitType As String, ByVal naam As String, ByVal shopNr As String, ByVal personeelsNr As String)
    Dim rr As ListRow
    Dim gevonden As Boolean
    Dim gevonden2 As Boolean
    Dim waarde As Double
    Dim waarde2 As Double

    Set rr = ZoekOfMaakResultaatRij(tbl, periode, entiteitType, naam)

    ZetWaarde tbl, rr, "Periode", periode
    ZetWaarde tbl, rr, "EntiteitType", entiteitType
    ZetWaarde tbl, rr, "Naam", naam
    ZetWaarde tbl, rr, "PersoneelsNr", personeelsNr
    ZetWaarde tbl, rr, "ShopNr", shopNr
    NeemTargetsOver tbl, rr, periode, entiteitType, naam

    If LCase$(Trim$(entiteitType)) = "winkel" Then
        waarde = 0
        gevonden = TryHaalWinkelOmzet(shopNr, waarde)
        ZetWaardeAlsGevonden tbl, rr, "Omzet", waarde, gevonden, naam, "I_Sales"

        waarde = 0
        gevonden = TryZoekShopWaarde("I_LifeShops", shopNr, 4, waarde)
        ZetWaardeAlsGevonden tbl, rr, "Life", waarde, gevonden, naam, "I_LifeShops"

        waarde = 0
        gevonden = TryZoekLinkShop(shopNr, waarde)
        ZetWaardeAlsGevonden tbl, rr, "LinkPct", PctAlsGetal(waarde), gevonden, naam, "I_LinkShop"
    Else
        waarde = 0
        waarde2 = 0
        gevonden = TryZoekIAccPersoon(shopNr, personeelsNr, "total sales access", 8, waarde)
        gevonden2 = TryZoekIAccPersoon(shopNr, personeelsNr, "total sales hw", 8, waarde2)
        ZetWaardeAlsGevonden tbl, rr, "Omzet", waarde + waarde2, (gevonden Or gevonden2), naam, "I_Acc omzet"

        waarde = 0
        gevonden = TryZoekLifePersoon(shopNr, personeelsNr, waarde)
        ZetWaardeAlsGevonden tbl, rr, "Life", waarde, gevonden, naam, "I_Life"

        waarde = 0
        gevonden = TryZoekLinkPersoon(shopNr, personeelsNr, waarde)
        ZetWaardeAlsGevonden tbl, rr, "LinkPct", PctAlsGetal(waarde), gevonden, naam, "I_LinkPers"
    End If

    waarde = 0
    gevonden = TryZoekPersOfShop("I_Insurance", shopNr, personeelsNr, entiteitType, 10, waarde)
    ZetWaardeAlsGevonden tbl, rr, "InsuranceStuks", waarde, gevonden, naam, "I_Insurance"
    waarde = 0
    gevonden = TryZoekPersOfShop("I_Insurance", shopNr, personeelsNr, entiteitType, 9, waarde)
    ZetWaardeAlsGevonden tbl, rr, "InsuranceKansen", waarde, gevonden, naam, "I_Insurance"

    waarde = 0
    gevonden = TryZoekPersOfShop("I_Abo", shopNr, personeelsNr, entiteitType, 4, waarde)
    ZetWaardeAlsGevonden tbl, rr, "AboStuks", waarde, gevonden, naam, "I_Abo"
    waarde = 0
    gevonden = TryZoekPersOfShop("I_Abo", shopNr, personeelsNr, entiteitType, 3, waarde)
    ZetWaardeAlsGevonden tbl, rr, "AboKansen", waarde, gevonden, naam, "I_Abo"

    waarde = 0
    gevonden = TryZoekPersOfShop("I_Abo", shopNr, personeelsNr, entiteitType, 7, waarde)
    ZetWaardeAlsGevonden tbl, rr, "DSPStuks", waarde, gevonden, naam, "I_Abo"
    waarde = 0
    gevonden = TryZoekPersOfShop("I_Abo", shopNr, personeelsNr, entiteitType, 6, waarde)
    ZetWaardeAlsGevonden tbl, rr, "DSPKansen", waarde, gevonden, naam, "I_Abo"

    waarde = 0
    gevonden = TryZoekRDI(shopNr, personeelsNr, entiteitType, 3, waarde)
    ZetWaardeAlsGevonden tbl, rr, "SPGStuks", waarde, gevonden, naam, "I_RDI"
    waarde = 0
    gevonden = TryZoekRDI(shopNr, personeelsNr, entiteitType, 4, waarde)
    ZetWaardeAlsGevonden tbl, rr, "SPGKansen", waarde, gevonden, naam, "I_RDI"

    waarde = 0
    gevonden = TryZoekRDI(shopNr, personeelsNr, entiteitType, 11, waarde)
    ZetWaardeAlsGevonden tbl, rr, "SRPStuks", waarde, gevonden, naam, "I_RDI"
    waarde = 0
    gevonden = TryZoekRDI(shopNr, personeelsNr, entiteitType, 12, waarde)
    ZetWaardeAlsGevonden tbl, rr, "SRPKansen", waarde, gevonden, naam, "I_RDI"

    waarde = 0
    If LCase$(Trim$(entiteitType)) = "winkel" Then
        gevonden = TryZoekIAccShop(shopNr, "total sales access", 8, waarde)
    Else
        gevonden = TryZoekIAccPersoon(shopNr, personeelsNr, "total sales access", 8, waarde)
    End If
    ZetWaardeAlsGevonden tbl, rr, "Accessoires", waarde, gevonden, naam, "I_Acc accessoires"

    waarde = 0
    gevonden = TryHaalMonster(shopNr, personeelsNr, entiteitType, waarde)
    ZetWaardeAlsGevonden tbl, rr, "Monster", waarde, gevonden, naam, "I_Monst"

    ' Extra KPI's en analysevelden. Ook hier wordt een bestaande waarde nooit
    ' door nul vervangen wanneer de bijbehorende bronrij ontbreekt.
    ZetTryPersOfShop tbl, rr, "BuyWayStuks", "I_BW", shopNr, personeelsNr, entiteitType, 4, False, naam
    ZetTryPersOfShop tbl, rr, "BuyWayKansen", "I_BW", shopNr, personeelsNr, entiteitType, 3, False, naam
    ZetTryPersOfShop tbl, rr, "BuyWayPct", "I_BW", shopNr, personeelsNr, entiteitType, 5, True, naam

    ZetTryPersOfShop tbl, rr, "LeadersStuks", "I_LeaderS", shopNr, personeelsNr, entiteitType, 4, False, naam
    ZetTryPersOfShop tbl, rr, "LeadersKansen", "I_LeaderS", shopNr, personeelsNr, entiteitType, 3, False, naam
    ZetTryPersOfShop tbl, rr, "LeadersPct", "I_LeaderS", shopNr, personeelsNr, entiteitType, 5, True, naam
    ZetTryPersOfShop tbl, rr, "LeadersStuksLY", "I_LeaderS", shopNr, personeelsNr, entiteitType, 11, False, naam
    ZetTryPersOfShop tbl, rr, "LeadersKansenLY", "I_LeaderS", shopNr, personeelsNr, entiteitType, 10, False, naam
    ZetTryPersOfShop tbl, rr, "LeadersPctLY", "I_LeaderS", shopNr, personeelsNr, entiteitType, 12, True, naam

    ZetTryPersOfShop tbl, rr, "InsuranceMobielStuks", "I_Insurance", shopNr, personeelsNr, entiteitType, 4, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMobielKansen", "I_Insurance", shopNr, personeelsNr, entiteitType, 3, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMobielPct", "I_Insurance", shopNr, personeelsNr, entiteitType, 5, True, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMultimediaStuks", "I_Insurance", shopNr, personeelsNr, entiteitType, 7, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMultimediaKansen", "I_Insurance", shopNr, personeelsNr, entiteitType, 6, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMultimediaPct", "I_Insurance", shopNr, personeelsNr, entiteitType, 8, True, naam

    ZetTryPersOfShop tbl, rr, "InsuranceMobielStuksLY", "I_Insurance", shopNr, personeelsNr, entiteitType, 13, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMobielKansenLY", "I_Insurance", shopNr, personeelsNr, entiteitType, 12, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMobielPctLY", "I_Insurance", shopNr, personeelsNr, entiteitType, 14, True, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMultimediaStuksLY", "I_Insurance", shopNr, personeelsNr, entiteitType, 16, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMultimediaKansenLY", "I_Insurance", shopNr, personeelsNr, entiteitType, 15, False, naam
    ZetTryPersOfShop tbl, rr, "InsuranceMultimediaPctLY", "I_Insurance", shopNr, personeelsNr, entiteitType, 17, True, naam

    If LCase$(Trim$(entiteitType)) = "verkoper" Then
        ZetTryLinkSub tbl, rr, "LinkGEM", shopNr, personeelsNr, "1. Major Domestic Appl", naam
        ZetTryLinkSub tbl, rr, "LinkPEM", shopNr, personeelsNr, "2. Small Domestic Appl", naam
        ZetTryLinkSub tbl, rr, "LinkRTV", shopNr, personeelsNr, "3. Sound & Vision", naam
        ZetTryLinkSub tbl, rr, "LinkCOMM", shopNr, personeelsNr, "4. Communication", naam
        ZetTryLinkSub tbl, rr, "LinkMM", shopNr, personeelsNr, "5. Multi-Media", naam
    End If

    If LCase$(Trim$(entiteitType)) = "winkel" Then
        gevonden = TryZoekShopS(shopNr, 6, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SStuks", waarde, gevonden, naam, "I_S"
        gevonden = TryZoekShopS(shopNr, 7, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SEuro", waarde, gevonden, naam, "I_S"
        gevonden = TryZoekShopS(shopNr, 9, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SRatio", PctAlsGetal(waarde), gevonden, naam, "I_S"
    Else
        gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, entiteitType, 6, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SStuks", waarde, gevonden, naam, "I_LeaderS"
        gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, entiteitType, 7, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SEuro", waarde, gevonden, naam, "I_LeaderS"
        gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, entiteitType, 8, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SRatio", waarde, gevonden, naam, "I_LeaderS"
        gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, entiteitType, 13, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SStuksLY", waarde, gevonden, naam, "I_LeaderS"
        gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, entiteitType, 14, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SEuroLY", waarde, gevonden, naam, "I_LeaderS"
        gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, entiteitType, 15, waarde)
        ZetWaardeAlsGevonden tbl, rr, "SRatioLY", waarde, gevonden, naam, "I_LeaderS"
    End If

    ' NPS wordt bewust niet overschreven.
End Sub

Public Sub HerberekenSResultatenActuelePeriode()
    Dim tblR As ListObject
    Dim r As ListRow
    Dim periode As String, shopNr As String
    Dim entiteitType As String, personeelsNr As String, naam As String
    Dim waarde As Double, gevonden As Boolean

    On Error GoTo Klaar

    periode = BepaalResultatenPeriode()
    shopNr = Trim$(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").Value))
    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")

    For Each r In tblR.ListRows
        If NormaliseerPeriode(r.Range.Cells(1, tblR.ListColumns("Periode").Index).Value) = periode Then
            entiteitType = LCase$(Trim$(CStr(r.Range.Cells(1, tblR.ListColumns("EntiteitType").Index).Value)))
            naam = Trim$(CStr(r.Range.Cells(1, tblR.ListColumns("Naam").Index).Value))

            If entiteitType = "winkel" Then
                waarde = 0
                gevonden = TryZoekShopS(shopNr, 6, waarde)
                ZetWaardeAlsGevonden tblR, r, "SStuks", waarde, gevonden, naam, "I_S"
                waarde = 0
                gevonden = TryZoekShopS(shopNr, 7, waarde)
                ZetWaardeAlsGevonden tblR, r, "SEuro", waarde, gevonden, naam, "I_S"
                waarde = 0
                gevonden = TryZoekShopS(shopNr, 9, waarde)
                ZetWaardeAlsGevonden tblR, r, "SRatio", PctAlsGetal(waarde), gevonden, naam, "I_S"
            ElseIf entiteitType = "verkoper" Then
                personeelsNr = Trim$(CStr(r.Range.Cells(1, tblR.ListColumns("PersoneelsNr").Index).Value))
                waarde = 0
                gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, "Verkoper", 6, waarde)
                ZetWaardeAlsGevonden tblR, r, "SStuks", waarde, gevonden, naam, "I_LeaderS"
                waarde = 0
                gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, "Verkoper", 7, waarde)
                ZetWaardeAlsGevonden tblR, r, "SEuro", waarde, gevonden, naam, "I_LeaderS"
                waarde = 0
                gevonden = TryZoekPersOfShop("I_LeaderS", shopNr, personeelsNr, "Verkoper", 8, waarde)
                ZetWaardeAlsGevonden tblR, r, "SRatio", waarde, gevonden, naam, "I_LeaderS"
            End If
        End If
    Next r
Klaar:
End Sub

Public Sub OpschonenInactieveVerkopersActuelePeriode()
    Dim tblR As ListObject, tblV As ListObject
    Dim i As Long, vr As ListRow
    Dim periode As String
    Dim naam As String, personeelsNr As String
    Dim actiefGevonden As Boolean
    Dim vNaam As String, vId As String, vActief As String

    On Error GoTo Klaar

    periode = BepaalResultatenPeriode()
    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    Set tblV = ThisWorkbook.Worksheets("Verkopers").ListObjects("Verkopers")

    For i = tblR.ListRows.Count To 1 Step -1
        If NormaliseerPeriode(tblR.ListRows(i).Range.Cells(1, tblR.ListColumns("Periode").Index).value) = periode _
        And LCase(Trim(CStr(tblR.ListRows(i).Range.Cells(1, tblR.ListColumns("EntiteitType").Index).value))) = "verkoper" Then

            naam = LCase(Trim(CStr(tblR.ListRows(i).Range.Cells(1, tblR.ListColumns("Naam").Index).value)))
            personeelsNr = ""
            On Error Resume Next
            personeelsNr = Trim(CStr(tblR.ListRows(i).Range.Cells(1, tblR.ListColumns("PersoneelsNr").Index).value))
            On Error GoTo Klaar

            actiefGevonden = False
            For Each vr In tblV.ListRows
                vNaam = LCase(Trim(CStr(vr.Range.Cells(1, tblV.ListColumns("Naam").Index).value)))
                vId = Trim(CStr(vr.Range.Cells(1, tblV.ListColumns("PersoneelsNr").Index).value))
                vActief = LCase(Trim(CStr(vr.Range.Cells(1, tblV.ListColumns("Actief").Index).value)))

                If vActief <> "nee" And vActief <> "no" And vActief <> "0" And vActief <> "false" And vActief <> "n" Then
                    If (personeelsNr <> "" And vId = personeelsNr) Or (naam <> "" And vNaam = naam) Then
                        actiefGevonden = True
                        Exit For
                    End If
                End If
            Next vr

            If Not actiefGevonden Then tblR.ListRows(i).Delete
        End If
    Next i
Klaar:
End Sub

Private Function ZoekShopS(ByVal shopNr As String, ByVal kolomNr As Long) As Double
    Dim ws As Worksheet
    Dim i As Long, lastRow As Long
    Dim label As String

    On Error GoTo NietGevonden
    Set ws = ThisWorkbook.Worksheets("I_S")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            label = LCase(Trim(CStr(ws.Cells(i, 2).value)))
            If InStr(label, "total of all groups") > 0 Or InStr(label, "total") > 0 Then
                ZoekShopS = GetNum(ws.Cells(i, kolomNr).value)
                Exit Function
            End If
        End If
    Next i

NietGevonden:
    ZoekShopS = 0
End Function

Private Function HuidigePeriode() As String
    Dim v As Variant
    v = ThisWorkbook.Worksheets("Instellingen").Range("B3").value
    If Trim(CStr(v)) <> "" Then
        HuidigePeriode = NormaliseerPeriode(v)
    Else
        HuidigePeriode = Format(Date, "yyyy-mm")
    End If
End Function

Private Function ZoekOfMaakResultaatRij(ByVal tbl As ListObject, ByVal periode As String, ByVal entiteitType As String, ByVal naam As String) As ListRow
    Dim r As ListRow
    For Each r In tbl.ListRows
        If NormaliseerPeriode(r.Range.Cells(1, tbl.ListColumns("Periode").Index).value) = periode _
        And LCase(Trim(CStr(r.Range.Cells(1, tbl.ListColumns("EntiteitType").Index).value))) = LCase(Trim(entiteitType)) _
        And LCase(Trim(CStr(r.Range.Cells(1, tbl.ListColumns("Naam").Index).value))) = LCase(Trim(naam)) Then
            Set ZoekOfMaakResultaatRij = r
            Exit Function
        End If
    Next r
    Set ZoekOfMaakResultaatRij = tbl.ListRows.Add
End Function

Private Sub ZetWaarde(ByVal tbl As ListObject, ByVal r As ListRow, ByVal kolomNaam As String, ByVal waarde As Variant)
    On Error Resume Next
    r.Range.Cells(1, tbl.ListColumns(kolomNaam).Index).value = waarde
    On Error GoTo 0
End Sub

Private Function NormaliseerPeriode(ByVal waarde As Variant) As String
    If IsDate(waarde) Then
        NormaliseerPeriode = Format(CDate(waarde), "yyyy-mm")
    Else
        NormaliseerPeriode = Trim(CStr(waarde))
    End If
End Function


Private Sub ZetWaardeAlsGevonden(ByVal tbl As ListObject, ByVal r As ListRow, ByVal kolomNaam As String, _
                                  ByVal waarde As Variant, ByVal gevonden As Boolean, _
                                  ByVal entiteitNaam As String, ByVal bron As String)
    Dim fallbackWaarde As Double
    If gevonden Then
        ZetWaarde tbl, r, kolomNaam, waarde
    ElseIf TryHistoriekFallback(tbl, r, kolomNaam, fallbackWaarde) Then
        ZetWaarde tbl, r, kolomNaam, fallbackWaarde
        RegistreerOntbrekendeBron entiteitNaam, kolomNaam, bron & " - historiekfallback"
    Else
        RegistreerOntbrekendeBron entiteitNaam, kolomNaam, bron
    End If
End Sub

Private Function TryHistoriekFallback(ByVal tblR As ListObject, ByVal rr As ListRow, _
                                       ByVal resultaatKolom As String, ByRef uitkomst As Double) As Boolean
    Dim tblH As ListObject, hr As ListRow
    Dim periode As String, entiteitType As String, naam As String, personeelsNr As String
    Dim kpi As String, subKpi As String, bronKolom As String
    If Not HistoriekMapping(resultaatKolom, kpi, subKpi, bronKolom) Then Exit Function
    On Error GoTo GeenFallback
    Set tblH = ThisWorkbook.Worksheets("Historiek_Maand").ListObjects("tblHistoriekMaand")
    periode = NormaliseerPeriode(GetResultaatCel(tblR, rr, "Periode"))
    entiteitType = LCase$(Trim$(CStr(GetResultaatCel(tblR, rr, "EntiteitType"))))
    naam = LCase$(Trim$(CStr(GetResultaatCel(tblR, rr, "Naam"))))
    personeelsNr = Trim$(CStr(GetResultaatCel(tblR, rr, "PersoneelsNr")))
    For Each hr In tblH.ListRows
        If NormaliseerPeriode(GetHistoriekCel(tblH, hr, "Periode")) = periode _
           And LCase$(Trim$(CStr(GetHistoriekCel(tblH, hr, "EntiteitType")))) = entiteitType _
           And LCase$(Trim$(CStr(GetHistoriekCel(tblH, hr, "KPI")))) = LCase$(kpi) _
           And LCase$(Trim$(CStr(GetHistoriekCel(tblH, hr, "SubKPI")))) = LCase$(subKpi) Then
            If entiteitType = "verkoper" Then
                If personeelsNr <> "" Then
                    If Trim$(CStr(GetHistoriekCel(tblH, hr, "PersoneelsNr"))) <> personeelsNr Then GoTo VolgendeRij
                ElseIf LCase$(Trim$(CStr(GetHistoriekCel(tblH, hr, "Naam")))) <> naam Then
                    GoTo VolgendeRij
                End If
            ElseIf LCase$(Trim$(CStr(GetHistoriekCel(tblH, hr, "Naam")))) <> naam Then
                GoTo VolgendeRij
            End If
            uitkomst = DiestroyersNumber(GetHistoriekCel(tblH, hr, bronKolom))
            TryHistoriekFallback = True
            Exit Function
        End If
VolgendeRij:
    Next hr
GeenFallback:
End Function

Private Function HistoriekMapping(ByVal resultaatKolom As String, ByRef kpi As String, _
                                   ByRef subKpi As String, ByRef bronKolom As String) As Boolean
    subKpi = ""
    Select Case LCase$(resultaatKolom)
        Case "omzet": kpi = "Omzet": bronKolom = "Waarde"
        Case "life": kpi = "Life": bronKolom = "Waarde"
        Case "insurancestuks": kpi = "Insurance": subKpi = "Totaal": bronKolom = "Stuks"
        Case "insurancekansen": kpi = "Insurance": subKpi = "Totaal": bronKolom = "Kansen"
        Case "abostuks": kpi = "Abo": bronKolom = "Stuks"
        Case "abokansen": kpi = "Abo": bronKolom = "Kansen"
        Case "dspstuks": kpi = "DSP": bronKolom = "Stuks"
        Case "dspkansen": kpi = "DSP": bronKolom = "Kansen"
        Case "spgstuks": kpi = "SPG": bronKolom = "Stuks"
        Case "spgkansen": kpi = "SPG": bronKolom = "Kansen"
        Case "srpstuks": kpi = "SRP": bronKolom = "Stuks"
        Case "srpkansen": kpi = "SRP": bronKolom = "Kansen"
        Case "accessoires": kpi = "Accessoires": bronKolom = "Waarde"
        Case "linkpct": kpi = "Link": subKpi = "Totaal": bronKolom = "WaardePct"
        Case "monster": kpi = "Monster": bronKolom = "Waarde"
        Case "buywaystuks": kpi = "BuyWay": bronKolom = "Stuks"
        Case "buywaykansen": kpi = "BuyWay": bronKolom = "Kansen"
        Case "buywaypct": kpi = "BuyWay": bronKolom = "WaardePct"
        Case "leadersstuks": kpi = "Leaders": bronKolom = "Stuks"
        Case "leaderskansen": kpi = "Leaders": bronKolom = "Kansen"
        Case "leaderspct": kpi = "Leaders": bronKolom = "WaardePct"
        Case "insurancemobielstuks": kpi = "Insurance": subKpi = "Mobiel": bronKolom = "Stuks"
        Case "insurancemobielkansen": kpi = "Insurance": subKpi = "Mobiel": bronKolom = "Kansen"
        Case "insurancemobielpct": kpi = "Insurance": subKpi = "Mobiel": bronKolom = "WaardePct"
        Case "insurancemultimediastuks": kpi = "Insurance": subKpi = "Multimedia": bronKolom = "Stuks"
        Case "insurancemultimediakansen": kpi = "Insurance": subKpi = "Multimedia": bronKolom = "Kansen"
        Case "insurancemultimediapct": kpi = "Insurance": subKpi = "Multimedia": bronKolom = "WaardePct"
        Case "linkgem": kpi = "Link": subKpi = "GEM": bronKolom = "WaardePct"
        Case "linkpem": kpi = "Link": subKpi = "PEM": bronKolom = "WaardePct"
        Case "linkrtv": kpi = "Link": subKpi = "RTV": bronKolom = "WaardePct"
        Case "linkcomm": kpi = "Link": subKpi = "COMM": bronKolom = "WaardePct"
        Case "linkmm": kpi = "Link": subKpi = "MM": bronKolom = "WaardePct"
        Case "sstuks": kpi = "S": bronKolom = "Stuks"
        Case "seuro": kpi = "S": bronKolom = "Waarde"
        Case "sratio": kpi = "S": bronKolom = "WaardePct"
        Case Else: Exit Function
    End Select
    HistoriekMapping = True
End Function

Private Function GetResultaatCel(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal kolom As String) As Variant
    On Error GoTo Leeg
    GetResultaatCel = rr.Range.Cells(1, tbl.ListColumns(kolom).Index).Value2
    Exit Function
Leeg:
    GetResultaatCel = ""
End Function

Private Function GetHistoriekCel(ByVal tbl As ListObject, ByVal rr As ListRow, ByVal kolom As String) As Variant
    On Error GoTo Leeg
    GetHistoriekCel = rr.Range.Cells(1, tbl.ListColumns(kolom).Index).Value2
    Exit Function
Leeg:
    GetHistoriekCel = ""
End Function

Public Sub ValideerActueleResultatenOfGeefFout()
    Dim tblR As ListObject, r As ListRow
    Dim periode As String, typeNaam As String, aantal As Long
    Dim omzetSom As Double, lifeSom As Double, accSom As Double
    Dim details As String, nm As String
    periode = BepaalResultatenPeriode()
    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    For Each r In tblR.ListRows
        If NormaliseerPeriode(GetResultaatCel(tblR, r, "Periode")) = periode Then
            typeNaam = LCase$(Trim$(CStr(GetResultaatCel(tblR, r, "EntiteitType"))))
            If typeNaam = "verkoper" Then
                aantal = aantal + 1
                omzetSom = omzetSom + DiestroyersNumber(GetResultaatCel(tblR, r, "Omzet"))
                lifeSom = lifeSom + DiestroyersNumber(GetResultaatCel(tblR, r, "Life"))
                accSom = accSom + DiestroyersNumber(GetResultaatCel(tblR, r, "Accessoires"))
                nm = CStr(GetResultaatCel(tblR, r, "Naam"))
                details = details & vbCrLf & "- " & nm & ": omzet " & _
                          Format$(DiestroyersNumber(GetResultaatCel(tblR, r, "Omzet")), "0") & _
                          ", life " & Format$(DiestroyersNumber(GetResultaatCel(tblR, r, "Life")), "0") & _
                          ", accessoires " & Format$(DiestroyersNumber(GetResultaatCel(tblR, r, "Accessoires")), "0")
            End If
        End If
    Next r
    If aantal = 0 Then Err.Raise vbObjectError + 7720, "ValideerActueleResultatenOfGeefFout", _
        "Geen verkopersresultaten gevonden voor " & periode & "."
    If omzetSom = 0 And lifeSom = 0 And accSom = 0 Then
        Err.Raise vbObjectError + 7721, "ValideerActueleResultatenOfGeefFout", _
          "De kern-KPI's konden niet uit de importbladen of Historiek_Maand worden hersteld." & _
          vbCrLf & vbCrLf & "Resultaatcontrole:" & details & vbCrLf & vbCrLf & _
          "Voer HerstelResultatenVanProjectSnapshot uit. Het herstelbestand staat in assets."
    End If
End Sub

Private Sub RegistreerOntbrekendeBron(ByVal entiteitNaam As String, ByVal kolomNaam As String, ByVal bron As String)
    Dim regel As String
    regel = "- " & entiteitNaam & " / " & kolomNaam & " (" & bron & ")"
    If InStr(1, mOntbrekendeBronnen, regel, vbTextCompare) = 0 Then
        If Len(mOntbrekendeBronnen) > 0 Then mOntbrekendeBronnen = mOntbrekendeBronnen & vbCrLf
        mOntbrekendeBronnen = mOntbrekendeBronnen & regel
    End If
End Sub

Private Sub ZetTryPersOfShop(ByVal tbl As ListObject, ByVal r As ListRow, ByVal kolomNaam As String, _
                             ByVal sheetName As String, ByVal shopNr As String, ByVal personeelsNr As String, _
                             ByVal entiteitType As String, ByVal waardeKolom As Long, _
                             ByVal alsPercentage As Boolean, ByVal entiteitNaam As String)
    Dim waarde As Double, gevonden As Boolean
    gevonden = TryZoekPersOfShop(sheetName, shopNr, personeelsNr, entiteitType, waardeKolom, waarde)
    If alsPercentage Then waarde = PctAlsGetal(waarde)
    ZetWaardeAlsGevonden tbl, r, kolomNaam, waarde, gevonden, entiteitNaam, sheetName
End Sub

Private Sub ZetTryLinkSub(ByVal tbl As ListObject, ByVal r As ListRow, ByVal kolomNaam As String, _
                          ByVal shopNr As String, ByVal personeelsNr As String, _
                          ByVal labelExact As String, ByVal entiteitNaam As String)
    Dim waarde As Double, gevonden As Boolean
    gevonden = TryZoekLinkSub(shopNr, personeelsNr, labelExact, waarde)
    ZetWaardeAlsGevonden tbl, r, kolomNaam, PctAlsGetal(waarde), gevonden, entiteitNaam, "I_LinkPers"
End Sub

Private Sub HerstelResultatenBackup(ByVal tbl As ListObject, ByVal backup As Variant)
    Dim rowCount As Long, colCount As Long
    If IsEmpty(backup) Then Exit Sub
    rowCount = UBound(backup, 1)
    colCount = UBound(backup, 2)
    tbl.Resize tbl.Range.Cells(1, 1).Resize(rowCount, colCount)
    tbl.Range.Value2 = backup
End Sub

Private Function TryHaalWinkelOmzet(ByVal shopNr As String, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_Sales")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) _
           And CleanText(ws.Cells(i, 2).Value) = "total yr" Then
            uitkomst = GetNum(ws.Cells(i, 21).Value)
            TryHaalWinkelOmzet = True
            Exit Function
        End If
    Next i
End Function

Private Function TryZoekShopWaarde(ByVal sheetName As String, ByVal shopNr As String, _
                                    ByVal waardeKolom As Long, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets(sheetName)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            uitkomst = GetNum(ws.Cells(i, waardeKolom).Value)
            TryZoekShopWaarde = True
            Exit Function
        End If
    Next i
End Function

Private Function TryZoekLifePersoon(ByVal shopNr As String, ByVal personeelsNr As String, _
                                     ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_Life")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) _
           And Trim$(CStr(ws.Cells(i, 3).Value)) = personeelsNr Then
            uitkomst = GetNum(ws.Cells(i, 6).Value)
            TryZoekLifePersoon = True
            Exit Function
        End If
    Next i
End Function

Private Function TryZoekPersOfShop(ByVal sheetName As String, ByVal shopNr As String, _
                                    ByVal personeelsNr As String, ByVal entiteitType As String, _
                                    ByVal waardeKolom As Long, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long, b As String
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets(sheetName)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        b = CleanText(ws.Cells(i, 2).Value)

        If LCase$(Trim$(entiteitType)) = "winkel" Then
            ' Winkel-totaalrijen komen in meerdere vormen voor:
            '   TOTAAL SHOP 208
            '   TOTAL SHOP 208
            '   ## Total ## 208
            ' Daarom volstaat een totaalmarkering samen met het winkelnummer.
            If (InStr(b, "totaal") > 0 Or InStr(b, "total") > 0) _
               And InStr(b, CleanText(shopNr)) > 0 Then
                uitkomst = GetNum(ws.Cells(i, waardeKolom).Value)
                TryZoekPersOfShop = True
                Exit Function
            End If

            ' Compatibiliteit met bronnen die het winkelnummer enkel in kolom A zetten.
            If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
                If (InStr(b, "totaal") > 0 Or InStr(b, "total") > 0) Then
                    uitkomst = GetNum(ws.Cells(i, waardeKolom).Value)
                    TryZoekPersOfShop = True
                    Exit Function
                End If
            End If
        Else
            If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) _
               And StartsWithId(ws.Cells(i, 2).Value, personeelsNr) Then
                uitkomst = GetNum(ws.Cells(i, waardeKolom).Value)
                TryZoekPersOfShop = True
                Exit Function
            End If
        End If
    Next i
End Function

Private Function TryZoekRDI(ByVal shopNr As String, ByVal personeelsNr As String, _
                             ByVal entiteitType As String, ByVal waardeKolom As Long, _
                             ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long, keyCol As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_RDI")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If waardeKolom >= 10 Then keyCol = 10 Else keyCol = 2
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            If LCase$(Trim$(entiteitType)) = "winkel" Then
                If InStr(CleanText(ws.Cells(i, keyCol).Value), "total shop") > 0 Then
                    uitkomst = GetNum(ws.Cells(i, waardeKolom).Value)
                    TryZoekRDI = True
                    Exit Function
                End If
            ElseIf StartsWithId(ws.Cells(i, keyCol).Value, personeelsNr) Then
                uitkomst = GetNum(ws.Cells(i, waardeKolom).Value)
                TryZoekRDI = True
                Exit Function
            End If
        End If
    Next i
End Function

Private Function TryZoekIAccPersoon(ByVal shopNr As String, ByVal personeelsNr As String, _
                                     ByVal labelContains As String, ByVal waardeKolom As Long, _
                                     ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_Acc")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If Trim$(CStr(ws.Cells(i, 1).Value)) = personeelsNr _
           And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) _
           And InStr(CleanText(ws.Cells(i, 3).Value), labelContains) > 0 Then
            uitkomst = uitkomst + GetNum(ws.Cells(i, waardeKolom).Value)
            TryZoekIAccPersoon = True
        End If
    Next i
End Function

Private Function TryZoekIAccShop(ByVal shopNr As String, ByVal labelContains As String, _
                                  ByVal waardeKolom As Long, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long, label As String
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_Acc")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        label = CleanText(ws.Cells(i, 3).Value)
        If Trim$(CStr(ws.Cells(i, 1).Value)) = "0" _
           And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) _
           And InStr(label, labelContains) > 0 And InStr(label, "total shop") > 0 Then
            uitkomst = uitkomst + GetNum(ws.Cells(i, waardeKolom).Value)
            TryZoekIAccShop = True
        End If
    Next i
End Function

Private Function TryZoekLinkShop(ByVal shopNr As String, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_LinkShop")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) _
           And InStr(CleanText(ws.Cells(i, 2).Value), "total shop") > 0 Then
            uitkomst = GetNum(ws.Cells(i, 7).Value)
            TryZoekLinkShop = True
            Exit Function
        End If
    Next i
End Function

Private Function TryZoekLinkPersoon(ByVal shopNr As String, ByVal personeelsNr As String, _
                                     ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_LinkPers")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If Trim$(CStr(ws.Cells(i, 1).Value)) = personeelsNr _
           And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) _
           And InStr(CleanText(ws.Cells(i, 3).Value), "total person") > 0 Then
            uitkomst = GetNum(ws.Cells(i, 8).Value)
            TryZoekLinkPersoon = True
            Exit Function
        End If
    Next i
End Function

Private Function TryHaalMonster(ByVal shopNr As String, ByVal personeelsNr As String, _
                                 ByVal entiteitType As String, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long, shopGevonden As Boolean
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_Monst")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    If LCase$(Trim$(entiteitType)) = "winkel" Then
        For i = 1 To lastRow
            If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) _
               And InStr(CleanText(ws.Cells(i, 2).Value), "total sales monster") > 0 Then
                uitkomst = uitkomst + GetNum(ws.Cells(i, 7).Value)
                TryHaalMonster = True
            End If
        Next i
    Else
        For i = 1 To lastRow
            If DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) Then shopGevonden = True
            If Trim$(CStr(ws.Cells(i, 1).Value)) = personeelsNr _
               And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) _
               And CleanText(ws.Cells(i, 3).Value) = "total sales monster" Then
                uitkomst = GetNum(ws.Cells(i, 8).Value)
                TryHaalMonster = True
                Exit Function
            End If
        Next i
        ' Een ontbrekende verkopersrij in een geldig winkelbestand betekent nul verkopen.
        If shopGevonden Then TryHaalMonster = True
    End If
End Function

Private Function TryZoekShopS(ByVal shopNr As String, ByVal kolomNr As Long, _
                               ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long, label As String
    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_S")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            label = CleanText(ws.Cells(i, 2).Value)
            If InStr(label, "total of all groups") > 0 Or InStr(label, "total") > 0 Then
                uitkomst = GetNum(ws.Cells(i, kolomNr).Value)
                TryZoekShopS = True
                Exit Function
            End If
        End If
    Next i
End Function

Private Function TryZoekLinkSub(ByVal shopNr As String, ByVal personeelsNr As String, _
                                 ByVal labelExact As String, ByRef uitkomst As Double) As Boolean
    Dim ws As Worksheet, lastRow As Long, i As Long
    Dim verkoperGevonden As Boolean

    uitkomst = 0
    Set ws = ThisWorkbook.Worksheets("I_LinkPers")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row

    For i = 1 To lastRow
        If Trim$(CStr(ws.Cells(i, 1).Value)) = personeelsNr _
           And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) Then

            verkoperGevonden = True

            If CleanText(ws.Cells(i, 3).Value) = CleanText(labelExact) Then
                uitkomst = GetNum(ws.Cells(i, 8).Value)
                TryZoekLinkSub = True
                Exit Function
            End If
        End If
    Next i

    ' De verkoper bestaat in de Link-bron, maar deze productgroep ontbreekt.
    ' Dat betekent een geldige verkoopwaarde van nul, niet een ontbrekende bron.
    If verkoperGevonden Then
        uitkomst = 0
        TryZoekLinkSub = True
    End If
End Function

Public Sub DiagnoseResultatenBronnen()
    Dim tblV As ListObject, r As ListRow
    Dim shopNr As String, naam As String, id As String, actief As String
    Dim verslag As String, waarde As Double

    On Error GoTo Fout

    shopNr = Trim$(CStr(ThisWorkbook.Worksheets("Instellingen").Range("B7").Value))
    Set tblV = ThisWorkbook.Worksheets("Verkopers").ListObjects("Verkopers")
    verslag = "BRONCONTROLE SHOP " & shopNr & vbCrLf & String$(42, "-")

    For Each r In tblV.ListRows
        naam = Trim$(CStr(r.Range.Cells(1, tblV.ListColumns("Naam").Index).Value))
        id = Trim$(CStr(r.Range.Cells(1, tblV.ListColumns("PersoneelsNr").Index).Value))
        actief = LCase$(Trim$(CStr(r.Range.Cells(1, tblV.ListColumns("Actief").Index).Value)))
        If naam <> "" And id <> "" And actief <> "nee" And actief <> "no" And actief <> "0" Then
            verslag = verslag & vbCrLf & naam & " [" & id & "]" & vbCrLf
            verslag = verslag & "  I_Acc omzet: " & JaNee(TryZoekIAccPersoon(shopNr, id, "total sales hw", 8, waarde)) & vbCrLf
            verslag = verslag & "  I_Acc accessoires: " & JaNee(TryZoekIAccPersoon(shopNr, id, "total sales access", 8, waarde)) & vbCrLf
            verslag = verslag & "  I_Life: " & JaNee(TryZoekLifePersoon(shopNr, id, waarde)) & vbCrLf
            verslag = verslag & "  I_RDI SPG/SRP: " & JaNee(TryZoekRDI(shopNr, id, "Verkoper", 3, waarde)) & vbCrLf
            verslag = verslag & "  I_Abo: " & JaNee(TryZoekPersOfShop("I_Abo", shopNr, id, "Verkoper", 3, waarde)) & vbCrLf
            verslag = verslag & "  I_Insurance: " & JaNee(TryZoekPersOfShop("I_Insurance", shopNr, id, "Verkoper", 9, waarde)) & vbCrLf
        End If
    Next r

    MsgBox verslag, vbInformation, "The Diestroyers"
    Exit Sub
Fout:
    MsgBox "Broncontrole mislukt: " & Err.Description, vbCritical, "The Diestroyers"
End Sub

Private Function JaNee(ByVal waarde As Boolean) As String
    If waarde Then JaNee = "OK" Else JaNee = "ONTBREEKT"
End Function

Private Function CleanText(ByVal v As Variant) As String
    CleanText = LCase(Trim(Replace(CStr(v), Chr(160), " ")))
End Function

Private Function GetNum(ByVal v As Variant) As Double
    GetNum = DiestroyersNumber(v)
End Function

Private Function PctAlsGetal(ByVal v As Variant) As Double
    PctAlsGetal = DiestroyersPercentPoints(v)
End Function

Private Function StartsWithId(ByVal textValue As Variant, ByVal personeelsNr As String) As Boolean
    Dim s As String
    s = Trim(CStr(textValue))
    StartsWithId = (Left(s, Len(personeelsNr)) = personeelsNr)
End Function

Private Function ZoekShopWaarde(ByVal sheetName As String, ByVal shopNr As String, ByVal waardeKolom As Long) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets(sheetName)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            ZoekShopWaarde = GetNum(ws.Cells(i, waardeKolom).value)
            Exit Function
        End If
    Next i
End Function

Private Function ZoekLifePersoon(ByVal shopNr As String, ByVal personeelsNr As String) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_Life")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) And Trim(CStr(ws.Cells(i, 3).value)) = personeelsNr Then
            ZoekLifePersoon = GetNum(ws.Cells(i, 6).value)
            Exit Function
        End If
    Next i
End Function

Private Function ZoekPersOfShopMetIdInKolomB(ByVal sheetName As String, ByVal shopNr As String, ByVal personeelsNr As String, ByVal entiteitType As String, ByVal waardeKolom As Long) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long, b As String
    Set ws = ThisWorkbook.Worksheets(sheetName)
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            b = CleanText(ws.Cells(i, 2).value)
            If entiteitType = "Winkel" Then
                If InStr(b, "total") > 0 And (InStr(b, "shop") > 0 Or InStr(b, shopNr) > 0) Then
                    ZoekPersOfShopMetIdInKolomB = GetNum(ws.Cells(i, waardeKolom).value)
                    Exit Function
                End If
            Else
                If StartsWithId(ws.Cells(i, 2).value, personeelsNr) Then
                    ZoekPersOfShopMetIdInKolomB = GetNum(ws.Cells(i, waardeKolom).value)
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

Private Function ZoekRDI(ByVal shopNr As String, ByVal personeelsNr As String, ByVal entiteitType As String, ByVal waardeKolom As Long) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long, keyCol As Long
    Set ws = ThisWorkbook.Worksheets("I_RDI")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    If waardeKolom >= 10 Then keyCol = 10 Else keyCol = 2
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) Then
            If entiteitType = "Winkel" Then
                If InStr(CleanText(ws.Cells(i, keyCol).value), "total shop") > 0 Then
                    ZoekRDI = GetNum(ws.Cells(i, waardeKolom).value)
                    Exit Function
                End If
            Else
                If StartsWithId(ws.Cells(i, keyCol).value, personeelsNr) Then
                    ZoekRDI = GetNum(ws.Cells(i, waardeKolom).value)
                    Exit Function
                End If
            End If
        End If
    Next i
End Function

Private Function HaalWinkelOmzet(ByVal shopNr As String) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_Sales")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) And CleanText(ws.Cells(i, 2).value) = "total yr" Then
            HaalWinkelOmzet = GetNum(ws.Cells(i, 21).value)
            Exit Function
        End If
    Next i
End Function

Private Function HaalVerkoperOmzet(ByVal shopNr As String, ByVal personeelsNr As String) As Double
    HaalVerkoperOmzet = ZoekIAccPersoon(shopNr, personeelsNr, "total sales access", 8) + _
                         ZoekIAccPersoon(shopNr, personeelsNr, "total sales hw", 8)
End Function

Private Function HaalAccessoires(ByVal shopNr As String, ByVal personeelsNr As String, ByVal entiteitType As String) As Double
    If entiteitType = "Winkel" Then
        HaalAccessoires = ZoekIAccShop(shopNr, "total sales access", 8)
    Else
        HaalAccessoires = ZoekIAccPersoon(shopNr, personeelsNr, "total sales access", 8)
    End If
End Function

Private Function ZoekIAccPersoon(ByVal shopNr As String, ByVal personeelsNr As String, ByVal labelContains As String, ByVal waardeKolom As Long) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_Acc")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = personeelsNr And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) Then
            If InStr(CleanText(ws.Cells(i, 3).value), labelContains) > 0 Then
                ZoekIAccPersoon = ZoekIAccPersoon + GetNum(ws.Cells(i, waardeKolom).value)
            End If
        End If
    Next i
End Function

Private Function ZoekIAccShop(ByVal shopNr As String, ByVal labelContains As String, ByVal waardeKolom As Long) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_Acc")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = "0" And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) Then
            If InStr(CleanText(ws.Cells(i, 3).value), labelContains) > 0 And InStr(CleanText(ws.Cells(i, 3).value), "total shop") > 0 Then
                ZoekIAccShop = ZoekIAccShop + GetNum(ws.Cells(i, waardeKolom).value)
            End If
        End If
    Next i
End Function

Private Function ZoekLinkShop(ByVal shopNr As String) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_LinkShop")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) And InStr(CleanText(ws.Cells(i, 2).value), "total shop") > 0 Then
            ZoekLinkShop = GetNum(ws.Cells(i, 7).value)
            Exit Function
        End If
    Next i
End Function

Private Function ZoekLinkPersoon(ByVal shopNr As String, ByVal personeelsNr As String) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_LinkPers")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = personeelsNr And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) Then
            If InStr(CleanText(ws.Cells(i, 3).value), "total person") > 0 Then
                ZoekLinkPersoon = GetNum(ws.Cells(i, 8).value)
                Exit Function
            End If
        End If
    Next i
End Function

Private Function HaalMonster(ByVal shopNr As String, ByVal personeelsNr As String, ByVal entiteitType As String) As Double
    If entiteitType = "Winkel" Then
        HaalMonster = ZoekMonsterShop(shopNr)
    Else
        HaalMonster = ZoekMonsterPersoon(shopNr, personeelsNr)
    End If
End Function

Private Function ZoekMonsterShop(ByVal shopNr As String) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_Monst")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row
    For i = 1 To lastRow
        If DiestroyersShopKey(ws.Cells(i, 1).Value) = DiestroyersShopKey(shopNr) And InStr(CleanText(ws.Cells(i, 2).value), "total sales monster") > 0 Then
            ZoekMonsterShop = ZoekMonsterShop + GetNum(ws.Cells(i, 7).value)
        End If
    Next i
End Function

Private Function ZoekMonsterPersoon(ByVal shopNr As String, ByVal personeelsNr As String) As Double

    Dim ws As Worksheet
    Dim lastRow As Long
    Dim i As Long
    Dim omschrijving As String

    Set ws = ThisWorkbook.Worksheets("I_Monst")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    For i = 1 To lastRow

        If Trim(CStr(ws.Cells(i, 1).value)) = Trim(personeelsNr) _
        And Trim(CStr(ws.Cells(i, 2).value)) = Trim(shopNr) Then

            omschrijving = LCase(Trim(CStr(ws.Cells(i, 3).value)))

            If omschrijving = "total sales monster" Then

                If IsNumeric(ws.Cells(i, 8).value) Then
                    ZoekMonsterPersoon = CDbl(ws.Cells(i, 8).value)
                Else
                    ZoekMonsterPersoon = 0
                End If

                Exit Function

            End If

        End If

    Next i

    ZoekMonsterPersoon = 0

End Function

Private Sub NeemTargetsOver(ByVal tblResultaten As ListObject, ByVal rr As ListRow, ByVal periode As String, ByVal entiteitType As String, ByVal naam As String)

    Dim ws As Worksheet
    Dim tblTargets As ListObject
    Dim tr As ListRow

    Set ws = ThisWorkbook.Worksheets("Targets")
    Set tblTargets = ws.ListObjects("Targets")

    For Each tr In tblTargets.ListRows

        If NormaliseerPeriode(tr.Range.Cells(1, tblTargets.ListColumns("Periode").Index).value) = periode _
        And LCase(Trim(CStr(tr.Range.Cells(1, tblTargets.ListColumns("EntiteitType").Index).value))) = LCase(Trim(entiteitType)) _
        And LCase(Trim(CStr(tr.Range.Cells(1, tblTargets.ListColumns("Naam").Index).value))) = LCase(Trim(naam)) Then

            ZetWaarde tblResultaten, rr, "OmzetTarget", TargetWaarde(tblTargets, tr, "OmzetTarget")
            ZetWaarde tblResultaten, rr, "LifeTarget", TargetWaarde(tblTargets, tr, "LifeTarget")
            ZetWaarde tblResultaten, rr, "InsuranceTargetPct", TargetWaarde(tblTargets, tr, "InsuranceTargetPct")
            ZetWaarde tblResultaten, rr, "AboTargetPct", TargetWaarde(tblTargets, tr, "AboTargetPct")
            ZetWaarde tblResultaten, rr, "DSPTargetPct", TargetWaarde(tblTargets, tr, "DSPTargetPct")
            ZetWaarde tblResultaten, rr, "SPGTargetPct", TargetWaarde(tblTargets, tr, "SPGTargetPct")
            ZetWaarde tblResultaten, rr, "SRPTargetPct", TargetWaarde(tblTargets, tr, "SRPTargetPct")
            ZetWaarde tblResultaten, rr, "AccessoiresTargetPct", TargetWaarde(tblTargets, tr, "AccessoiresTargetPct")
            ZetWaarde tblResultaten, rr, "NPSTarget", TargetWaarde(tblTargets, tr, "NPSTarget")
            ZetWaarde tblResultaten, rr, "LinkTargetPct", TargetWaarde(tblTargets, tr, "LinkTargetPct")
            ZetWaarde tblResultaten, rr, "MonsterTarget", TargetWaarde(tblTargets, tr, "MonsterTarget")

            Exit Sub

        End If

    Next tr

End Sub

Private Function TargetWaarde(ByVal tbl As ListObject, ByVal r As ListRow, ByVal kolomNaam As String) As Variant

    On Error GoTo GeenKolom
    TargetWaarde = r.Range.Cells(1, tbl.ListColumns(kolomNaam).Index).value
    Exit Function

GeenKolom:
    TargetWaarde = ""

End Function


Private Function BepaalResultatenPeriode() As String
    Dim d As Date
    d = Date

    If Day(d) = 1 Then
        BepaalResultatenPeriode = Format(DateAdd("m", -1, d), "yyyy-mm")
    Else
        BepaalResultatenPeriode = Format(d, "yyyy-mm")
    End If
End Function

Private Function ZoekLinkSub(ByVal shopNr As String, ByVal personeelsNr As String, ByVal labelExact As String) As Double
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Worksheets("I_LinkPers")
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).row

    For i = 1 To lastRow
        If Trim(CStr(ws.Cells(i, 1).value)) = personeelsNr And DiestroyersShopKey(ws.Cells(i, 2).Value) = DiestroyersShopKey(shopNr) Then
            If CleanText(ws.Cells(i, 3).value) = CleanText(labelExact) Then
                ZoekLinkSub = GetNum(ws.Cells(i, 8).value)
                Exit Function
            End If
        End If
    Next i
End Function
