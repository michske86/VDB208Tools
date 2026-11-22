Attribute VB_Name = "ProjectControle"
Option Explicit

Public Sub Diestroyers_VoerVolledigeControleUit()
    Dim fouten As String, info As String
    Dim periode As String
    Dim tblR As ListObject, tblV As ListObject, tblT As ListObject
    Dim r As ListRow, v As ListRow, t As ListRow
    Dim storeFound As Boolean, actiefFound As Boolean
    Dim naam As String, id As String, vNaam As String, vId As String, vActief As String
    Dim entiteit As String
    Dim sRatio As Double, sStuks As Double, sEuro As Double
    Dim dict As Object, key As String
    Dim duplicateTargets As Long, staleSellers As Long
    Dim resultText As String

    On Error GoTo Fout

    If Day(Date) = 1 Then
        periode = Format(DateAdd("m", -1, Date), "yyyy-mm")
    Else
        periode = Format(Date, "yyyy-mm")
    End If

    If Dir(LocalAssetsFile("config-data.js")) = "" Then
        fouten = fouten & vbCrLf & "- assets\config-data.js ontbreekt."
    End If

    If Dir(LocalAssetsFile("data-bridge.js")) = "" Then
        fouten = fouten & vbCrLf & "- assets\data-bridge.js ontbreekt."
    End If

    Set tblR = ThisWorkbook.Worksheets("Resultaten").ListObjects("Resultaten")
    Set tblV = ThisWorkbook.Worksheets("Verkopers").ListObjects("Verkopers")
    Set tblT = ThisWorkbook.Worksheets("Targets").ListObjects("Targets")

    For Each r In tblR.ListRows
        If NormaliseerControlePeriode(CellControle(tblR, r, "Periode")) = periode Then
            entiteit = LCase(Trim(CStr(CellControle(tblR, r, "EntiteitType"))))

            If entiteit = "winkel" Then
                storeFound = True
                sRatio = GetControleNum(CellControle(tblR, r, "SRatio"))
                sStuks = GetControleNum(CellControle(tblR, r, "SStuks"))
                sEuro = GetControleNum(CellControle(tblR, r, "SEuro"))
            ElseIf entiteit = "verkoper" Then
                naam = LCase(Trim(CStr(CellControle(tblR, r, "Naam"))))
                id = Trim(CStr(CellControle(tblR, r, "PersoneelsNr")))
                actiefFound = False

                For Each v In tblV.ListRows
                    vNaam = LCase(Trim(CStr(CellControle(tblV, v, "Naam"))))
                    vId = Trim(CStr(CellControle(tblV, v, "PersoneelsNr")))
                    vActief = LCase(Trim(CStr(CellControle(tblV, v, "Actief"))))

                    If vActief <> "nee" And vActief <> "no" And vActief <> "0" And vActief <> "false" And vActief <> "n" Then
                        If (id <> "" And vId = id) Or (naam <> "" And vNaam = naam) Then
                            actiefFound = True
                            Exit For
                        End If
                    End If
                Next v

                If Not actiefFound Then staleSellers = staleSellers + 1
            End If
        End If
    Next r

    If Not storeFound Then
        fouten = fouten & vbCrLf & "- Geen winkelresultaat gevonden voor " & periode & "."
    ElseIf sRatio = 0 And sStuks = 0 And sEuro = 0 Then
        fouten = fouten & vbCrLf & "- S-resultaat van de winkel is nog leeg voor " & periode & "."
    Else
        info = info & vbCrLf & "- S winkel: " & Format(sRatio, "0.00") & "% | " & Format(sStuks, "0") & " stuks | EUR " & Format(sEuro, "#,##0.00")
    End If

    If staleSellers > 0 Then
        fouten = fouten & vbCrLf & "- " & staleSellers & " actuele verkopersrij(en) horen niet meer bij de actieve verkopers."
    Else
        info = info & vbCrLf & "- Geen verouderde verkopersrijen in de actuele periode."
    End If

    Set dict = CreateObject("Scripting.Dictionary")
    For Each t In tblT.ListRows
        key = NormaliseerControlePeriode(CellControle(tblT, t, "Periode")) & "|" & _
              LCase(Trim(CStr(CellControle(tblT, t, "EntiteitType")))) & "|" & _
              LCase(Trim(CStr(CellControle(tblT, t, "Naam")))) & "|" & _
              Trim(CStr(CellControle(tblT, t, "ShopNr")))

        If dict.exists(key) Then
            duplicateTargets = duplicateTargets + 1
        Else
            dict.Add key, True
        End If
    Next t

    If duplicateTargets > 0 Then
        fouten = fouten & vbCrLf & "- " & duplicateTargets & " dubbele targetrij(en) gevonden."
    Else
        info = info & vbCrLf & "- Geen dubbele targetrijen."
    End If

    If fouten = "" Then
        resultText = "Controle geslaagd." & vbCrLf & info
        MsgBox resultText, vbInformation, "The Diestroyers"
    Else
        resultText = "Er zijn nog controlepunten:" & vbCrLf & fouten & vbCrLf & vbCrLf & "Informatie:" & info
        MsgBox resultText, vbExclamation, "The Diestroyers"
    End If
    Exit Sub

Fout:
    MsgBox "Projectcontrole mislukt: " & Err.Description, vbCritical, "The Diestroyers"
End Sub

Private Function CellControle(ByVal tbl As ListObject, ByVal r As ListRow, ByVal colName As String) As Variant
    On Error GoTo Geen
    CellControle = r.Range.Cells(1, tbl.ListColumns(colName).Index).value
    Exit Function
Geen:
    CellControle = ""
End Function

Private Function NormaliseerControlePeriode(ByVal v As Variant) As String
    If IsDate(v) Then
        NormaliseerControlePeriode = Format(CDate(v), "yyyy-mm")
    Else
        NormaliseerControlePeriode = Left$(Trim(CStr(v)), 7)
    End If
End Function

Private Function GetControleNum(ByVal v As Variant) As Double
    GetControleNum = DiestroyersNumber(v)
End Function
