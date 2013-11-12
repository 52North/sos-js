<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <title>SOS Plot Browser</title>

    <link rel="stylesheet" href="http://basmet.nerc-bas.ac.uk/js/sos/jquery/theme/default/jquery-ui.min.css" type="text/css"/>
    <link rel="stylesheet" href="http://basmet.nerc-bas.ac.uk/js/sos/SOS/SOS.Styles.css" type="text/css"/>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/OpenLayers/OpenLayers.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/jquery/jquery.min.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/jquery/jquery-ui.min.js"></script>
    <!--[if lte IE 8]><script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/flot/excanvas.min.js"></script><![endif]-->
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/flot/jquery.flot.min.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/flot/jquery.flot.selection.min.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/flot/jquery.flot.axislabels.min.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/flot/jquery.flot.navigate.min.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/SOS/SOS.js"></script>
    <script type="text/javascript" src="http://basmet.nerc-bas.ac.uk/js/sos/SOS/SOS.Ui.js"></script>
  </head>
  <body onload="init()">

<?php
  /* Optional title for the page */
  $title = (!empty($_POST['title']) ? $_POST['title'] : (!empty($_GET['title']) ? $_GET['title'] : NULL));
  if($title) print "<h3 id=\"title\">$title</h3>\n";
?>
    <p>This tests the SOS.Plot component from the SOS.Ui.js module.  This PHP script shows how a SOS.Plot can be dynamically constructed from arguments to this script's URL.  See also the SOS Plot Test example.</p>

    <!-- This is all the SOS.Plot needs -->
    <div id="sosPlot" class="sos-plot"></div>
  
<?php
  /* The following script constructs an SOS.Plot object from given http
     parameters, queries the given SOS instance, then embeds the plot in the
     "sosPlot" div on this page */
  include_once('sos-plot-browser-embed.php');
?>

  </body>
</html>

