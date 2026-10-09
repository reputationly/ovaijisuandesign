// plugin-launcher-2.js

var RelationshipTypes;

(function (RelationshipTypes2) {
  RelationshipTypes2["OfficeDocument"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
  RelationshipTypes2["FontTable"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
  RelationshipTypes2["Image"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
  RelationshipTypes2["Numbering"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
  RelationshipTypes2["Styles"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
  RelationshipTypes2["StylesWithEffects"] =
    "http://schemas.microsoft.com/office/2007/relationships/stylesWithEffects";
  RelationshipTypes2["Theme"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
  RelationshipTypes2["Settings"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings";
  RelationshipTypes2["WebSettings"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings";
  RelationshipTypes2["Hyperlink"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
  RelationshipTypes2["Footnotes"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes";
  RelationshipTypes2["Endnotes"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes";
  RelationshipTypes2["Footer"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
  RelationshipTypes2["Header"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
  RelationshipTypes2["ExtendedProperties"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties";
  RelationshipTypes2["CoreProperties"] =
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
  RelationshipTypes2["CustomProperties"] =
    "http://schemas.openxmlformats.org/package/2006/relationships/metadata/custom-properties";
  RelationshipTypes2["Comments"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
  RelationshipTypes2["CommentsExtended"] =
    "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";
  RelationshipTypes2["AltChunk"] =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk";
})(RelationshipTypes || (RelationshipTypes = {}));

var SectionType;

(function (SectionType2) {
  SectionType2["Continuous"] = "continuous";
  SectionType2["NextPage"] = "nextPage";
  SectionType2["NextColumn"] = "nextColumn";
  SectionType2["EvenPage"] = "evenPage";
  SectionType2["OddPage"] = "oddPage";
})(SectionType || (SectionType = {}));

var DomType;

(function (DomType2) {
  DomType2["Document"] = "document";
  DomType2["Paragraph"] = "paragraph";
  DomType2["Run"] = "run";
  DomType2["Break"] = "break";
  DomType2["NoBreakHyphen"] = "noBreakHyphen";
  DomType2["Table"] = "table";
  DomType2["Row"] = "row";
  DomType2["Cell"] = "cell";
  DomType2["Hyperlink"] = "hyperlink";
  DomType2["SmartTag"] = "smartTag";
  DomType2["Drawing"] = "drawing";
  DomType2["Image"] = "image";
  DomType2["Text"] = "text";
  DomType2["Tab"] = "tab";
  DomType2["Symbol"] = "symbol";
  DomType2["BookmarkStart"] = "bookmarkStart";
  DomType2["BookmarkEnd"] = "bookmarkEnd";
  DomType2["Footer"] = "footer";
  DomType2["Header"] = "header";
  DomType2["FootnoteReference"] = "footnoteReference";
  DomType2["EndnoteReference"] = "endnoteReference";
  DomType2["Footnote"] = "footnote";
  DomType2["Endnote"] = "endnote";
  DomType2["SimpleField"] = "simpleField";
  DomType2["ComplexField"] = "complexField";
  DomType2["Instruction"] = "instruction";
  DomType2["VmlPicture"] = "vmlPicture";
  DomType2["MmlMath"] = "mmlMath";
  DomType2["MmlMathParagraph"] = "mmlMathParagraph";
  DomType2["MmlFraction"] = "mmlFraction";
  DomType2["MmlFunction"] = "mmlFunction";
  DomType2["MmlFunctionName"] = "mmlFunctionName";
  DomType2["MmlNumerator"] = "mmlNumerator";
  DomType2["MmlDenominator"] = "mmlDenominator";
  DomType2["MmlRadical"] = "mmlRadical";
  DomType2["MmlBase"] = "mmlBase";
  DomType2["MmlDegree"] = "mmlDegree";
  DomType2["MmlSuperscript"] = "mmlSuperscript";
  DomType2["MmlSubscript"] = "mmlSubscript";
  DomType2["MmlPreSubSuper"] = "mmlPreSubSuper";
  DomType2["MmlSubArgument"] = "mmlSubArgument";
  DomType2["MmlSuperArgument"] = "mmlSuperArgument";
  DomType2["MmlNary"] = "mmlNary";
  DomType2["MmlDelimiter"] = "mmlDelimiter";
  DomType2["MmlRun"] = "mmlRun";
  DomType2["MmlEquationArray"] = "mmlEquationArray";
  DomType2["MmlLimit"] = "mmlLimit";
  DomType2["MmlLimitLower"] = "mmlLimitLower";
  DomType2["MmlMatrix"] = "mmlMatrix";
  DomType2["MmlMatrixRow"] = "mmlMatrixRow";
  DomType2["MmlBox"] = "mmlBox";
  DomType2["MmlBar"] = "mmlBar";
  DomType2["MmlGroupChar"] = "mmlGroupChar";
  DomType2["VmlElement"] = "vmlElement";
  DomType2["Inserted"] = "inserted";
  DomType2["Deleted"] = "deleted";
  DomType2["DeletedText"] = "deletedText";
  DomType2["Comment"] = "comment";
  DomType2["CommentReference"] = "commentReference";
  DomType2["CommentRangeStart"] = "commentRangeStart";
  DomType2["CommentRangeEnd"] = "commentRangeEnd";
  DomType2["AltChunk"] = "altChunk";
})(DomType || (DomType = {}));
