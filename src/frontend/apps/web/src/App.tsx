import React from "react";
import AppProvider from "ui/provider/app";
import Layout from "../components/Layout";
import { AppContentLoader } from "../components/AppContentLoader";
import { parseDataContext } from "./utils";

const dataContext = parseDataContext();

export const App = () => {
  return (
    <AppProvider>
      <Layout>
        <AppContentLoader dataContext={dataContext} />
      </Layout>
    </AppProvider>
  );
};
