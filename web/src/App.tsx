import React, { useState, useEffect } from 'react';
import { css, cx } from '@emotion/css';
import { Navbar, Nav, Icon, Dropdown, Sidenav } from 'rsuite';

interface AppProps {}

export function App({}: AppProps) {
  return (
    <div className="absolute inset-0">
      <Navbar appearance="inverse">
        <Navbar.Header>
          <a href="#" className="Lh(56px) mx-4">
            BigBoss or WebGuard[ian]? I don't know.
          </a>
        </Navbar.Header>
        <Navbar.Body>
          <Nav>
            <Nav.Item icon={<Icon icon="home" />}>Home</Nav.Item>
            <Nav.Item>News</Nav.Item>
            <Nav.Item>Products</Nav.Item>
            <Dropdown title="About">
              <Dropdown.Item>Company</Dropdown.Item>
              <Dropdown.Item>Team</Dropdown.Item>
              <Dropdown.Item>Contact</Dropdown.Item>
            </Dropdown>
          </Nav>
          <Nav pullRight>
            <Nav.Item icon={<Icon icon="cog" />}>Settings</Nav.Item>
          </Nav>
        </Navbar.Body>
      </Navbar>
      <div
        className={css`
          height: calc(100% - 56px);
        `}
      >
        <div className="Fl(start) W(250px) H(100%) Bgc(#f7f7fa) Ovy(a)">
          <Sidenav defaultOpenKeys={['3', '4']}>
            <Sidenav.Body>
              <Nav>
                <Nav.Item eventKey="1" icon={<Icon icon="dashboard" />}>
                  Dashboard
                </Nav.Item>
                <Nav.Item eventKey="2" icon={<Icon icon="group" />}>
                  User Group
                </Nav.Item>
                <Dropdown eventKey="3" title="Advanced" icon={<Icon icon="magic" />}>
                  <Dropdown.Item eventKey="3-1">Geo</Dropdown.Item>
                  <Dropdown.Item eventKey="3-2">Devices</Dropdown.Item>
                  <Dropdown.Item eventKey="3-3">Loyalty</Dropdown.Item>
                  <Dropdown.Item eventKey="3-4">Visit Depth</Dropdown.Item>
                </Dropdown>
                <Dropdown
                  eventKey="4"
                  title="Settings"
                  icon={<Icon icon="gear-circle" />}
                >
                  <Dropdown.Item eventKey="4-1">Applications</Dropdown.Item>
                  <Dropdown.Item eventKey="4-2">Channels</Dropdown.Item>
                  <Dropdown.Item eventKey="4-3">Versions</Dropdown.Item>
                  <Dropdown.Menu eventKey="4-5" title="Custom Action">
                    <Dropdown.Item eventKey="4-5-1">Action Name</Dropdown.Item>
                    <Dropdown.Item eventKey="4-5-2">Action Params</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav>
            </Sidenav.Body>
          </Sidenav>
        </div>
        <div className="Mstart(250px) H(100%) Ovy(a)"></div>
      </div>
    </div>
  );
}
