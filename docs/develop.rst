.. _develop-page:

Development Documentation
=========================

.. index:: developer, testing, debug, debugging

For general information how to contribute to the project, please see :ref:`the contribution page <contribute-page>`.


Testing pages
-------------

For quick and simple testing of developments you can use the test clients in the ``../examples`` folder. Open the file ``index-dev.html`` to see a list of available pages. The pages load the original source files from a relative path and hence always use the latest version.


Building the documentation
--------------------------

This projects uses Sphinx to write and build the documentation, all details at http://sphinx-doc.org.

To build documentation install Sphinx and then run ``make html`` in the root directory ``/``.