Attribute VB_Name = "PortfolioExport"
Option Explicit

' ============================================================
' THE DIESTROYERS - PORTFOLIO EXPORT
' Bron: assets\Portfolio-Export.csv
' Leest per RATE-blok de BIPS en het laatste percentage.
' Een RATE-regel zonder teller/percentage betekent 0%.
' Publiceert assets\portfolio-data.js voor gebruik vanuit file:// TV.
' ============================================================

Public Sub ImporteerEnPubliceerPortfolio()
    On Error GoTo Fout

    Dim sourcePath As String, sourceText As String
    sourcePath = LocalAssetsFile("Portfolio-Export.csv")
    If Not LocalFileExists(sourcePath) Then
        Err.Raise vbObjectError + 7650, "ImporteerEnPubliceerPortfolio", "Portfolio-Export.csv ontbreekt in de assets-map."
    End If

    sourceText = LocalReadUtf8File(sourcePath)
    If Len(Trim$(sourceText)) = 0 Then
        Err.Raise vbObjectError + 7651, "ImporteerEnPubliceerPortfolio", "Portfolio-Export.csv is leeg."
    End If

    Dim values As Object
    Set values = CreateObject("Scripting.Dictionary")
    values.CompareMode = vbTextCompare
    ParsePortfolioRates sourceText, values

    If values.Count = 0 Then
        Err.Raise vbObjectError + 7652, "ImporteerEnPubliceerPortfolio", "Geen RATE-blokken gevonden in Portfolio-Export.csv."
    End If

    LocalWriteUtf8File LocalAssetsFile("portfolio-data.js"), PortfolioJs(values)
    Exit Sub
Fout:
    Err.Raise Err.Number, "ImporteerEnPubliceerPortfolio", Err.Description
End Sub

Private Sub ParsePortfolioRates(ByVal sourceText As String, ByVal values As Object)
    Dim lines As Variant, i As Long, j As Long, fields As Variant
    Dim sellerField As String, bips As String, pct As String

    sourceText = Replace(sourceText, vbCrLf, vbLf)
    sourceText = Replace(sourceText, vbCr, vbLf)
    lines = Split(sourceText, vbLf)

    For i = LBound(lines) To UBound(lines)
        If UCase$(Trim$(CStr(lines(i)))) = "RATE" Then
            j = i + 1
            Do While j <= UBound(lines) And Len(Trim$(CStr(lines(j)))) = 0
                j = j + 1
            Loop
            If j <= UBound(lines) Then
                fields = Split(CStr(lines(j)), vbTab)
                sellerField = Trim$(CStr(fields(0)))
                bips = PortfolioBips(sellerField)
                If bips <> "" Then
                    ' Bewaar de RATE exact als percentagepunten. Bijvoorbeeld:
                    ' "62.50" in de bron moet als 62.50 naar de TV, niet als 0.625.
                    ' Dit blijft stabiel ongeacht de decimaalscheiding in Excel.
                    pct = "0"
                    If UBound(fields) >= 5 Then pct = PortfolioJsonNumber(CStr(fields(UBound(fields))))
                    values(bips) = pct
                End If
            End If
        End If
    Next i
End Sub

Private Function PortfolioBips(ByVal sellerField As String) As String
    Dim i As Long, ch As String
    sellerField = Trim$(sellerField)
    For i = 1 To Len(sellerField)
        ch = Mid$(sellerField, i, 1)
        If ch Like "#" Then
            PortfolioBips = PortfolioBips & ch
        Else
            Exit For
        End If
    Next i
End Function

Private Function PortfolioJsonNumber(ByVal value As String) As String
    ' Vermijd CDbl/Format$: die zijn afhankelijk van regionale instellingen
    ' en kunnen percentagepunten onbedoeld herschalen.
    Dim i As Long, ch As String, result As String, foundSeparator As Boolean

    value = Trim$(Replace(value, "%", ""))
    For i = 1 To Len(value)
        ch = Mid$(value, i, 1)
        If ch Like "#" Then
            result = result & ch
        ElseIf (ch = "." Or ch = ",") And Not foundSeparator Then
            result = result & "."
            foundSeparator = True
        End If
    Next i

    If result = "" Or result = "." Then result = "0"
    If Left$(result, 1) = "." Then result = "0" & result
    PortfolioJsonNumber = result
End Function

Private Function PortfolioJs(ByVal values As Object) As String
    Dim key As Variant, body As String
    body = "window.DIESTROYERS_PORTFOLIO = {" & vbCrLf
    For Each key In values.Keys
        If Len(body) > Len("window.DIESTROYERS_PORTFOLIO = {" & vbCrLf) Then body = body & "," & vbCrLf
        body = body & "  """ & CStr(key) & """: " & CStr(values(key))
    Next key
    PortfolioJs = body & vbCrLf & "};" & vbCrLf
End Function
